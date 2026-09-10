import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const COMPANY_ID='tolou-local-company';
const DB_NAME='tolou-qc.sqlite';
const BACKUP_MAGIC='TOLOU-CONCRETE-QC-BACKUP';
const BACKUP_VERSION=1;
const PENDING_MARKER='pending-restore.json';
const STAGED_DB='pending-restore.sqlite';
const STAGED_ATTACHMENTS='pending-restore-attachments';

export type CompanyProfile={companyName:string;qcManagerName:string;managingDirectorName:string;isConfigured:boolean};
export type SystemResult<T>={ok:true;data:T}|{ok:false;message:string};

type BackupEntry={path:string;data:string};
type BackupEnvelope={magic:string;version:number;createdAt:string;database:string;attachments:BackupEntry[]};

function trusted(event:IpcMainInvokeEvent){
  const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;
  const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;
  const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);
  try{return new URL(frame.url).protocol==='file:';}catch{return false;}
}
function safe<T>(operation:()=>T):SystemResult<T>{try{return{ok:true,data:operation()};}catch(error){console.error('[Tolou system]',error);return{ok:false,message:error instanceof Error&&/[\u0600-\u06FF]/u.test(error.message)?error.message:'عملیات سیستمی انجام نشد.'};}}
function dbPath(){return join(app.getPath('userData'),DB_NAME);}
function sqlString(value:string){return `'${value.replace(/'/g,"''")}'`;}
function openDb(){return new DatabaseSync(dbPath());}
function normalizeName(value:unknown,label:string){if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();}

export function readCompanyProfile():CompanyProfile{
  const db=openDb();
  try{
    const company=db.prepare('SELECT name FROM companies WHERE id=?').get(COMPANY_ID) as {name:string}|undefined;
    const profile=db.prepare('SELECT qc_manager_name,managing_director_name FROM company_profiles WHERE company_id=?').get(COMPANY_ID) as {qc_manager_name:string;managing_director_name:string}|undefined;
    const companyName=company?.name?.trim()??'';const qcManagerName=profile?.qc_manager_name?.trim()??'';const managingDirectorName=profile?.managing_director_name?.trim()??'';
    return{companyName,qcManagerName,managingDirectorName,isConfigured:Boolean(companyName&&companyName!=='شرکت شما'&&qcManagerName&&managingDirectorName)};
  }finally{db.close();}
}

export function saveCompanyProfile(input:{companyName:string;qcManagerName:string;managingDirectorName:string}):CompanyProfile{
  const companyName=normalizeName(input?.companyName,'نام شرکت');const qcManagerName=normalizeName(input?.qcManagerName,'مسئول کنترل کیفیت');const managingDirectorName=normalizeName(input?.managingDirectorName,'مدیرعامل');
  const db=openDb();
  try{
    db.exec('BEGIN IMMEDIATE');
    db.prepare('UPDATE companies SET name=? WHERE id=?').run(companyName,COMPANY_ID);
    db.prepare(`INSERT INTO company_profiles(company_id,qc_manager_name,managing_director_name,updated_at) VALUES(?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET qc_manager_name=excluded.qc_manager_name,managing_director_name=excluded.managing_director_name,updated_at=excluded.updated_at`).run(COMPANY_ID,qcManagerName,managingDirectorName,new Date().toISOString());
    db.exec('COMMIT');
  }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}finally{db.close();}
  return{companyName,qcManagerName,managingDirectorName,isConfigured:true};
}

async function collectFiles(root:string,current=root):Promise<BackupEntry[]>{
  if(!existsSync(current))return[];const result:BackupEntry[]=[];
  for(const entry of await readdir(current,{withFileTypes:true})){
    const absolute=join(current,entry.name);
    if(entry.isDirectory())result.push(...await collectFiles(root,absolute));
    else if(entry.isFile())result.push({path:absolute.slice(root.length+1).replace(/\\/g,'/'),data:(await readFile(absolute)).toString('base64')});
  }
  return result;
}

async function createBackup(event:IpcMainInvokeEvent):Promise<SystemResult<{cancelled:boolean;path?:string}>>{
  try{
    const window=BrowserWindow.fromWebContents(event.sender);if(!window)throw new Error('پنجره برنامه در دسترس نیست');
    const selection=await dialog.showSaveDialog(window,{title:'ذخیره نسخه پشتیبان طلوع',defaultPath:`Tolou-QC-Backup-${new Date().toISOString().slice(0,10)}.tolouqcbackup`,filters:[{name:'Tolou QC Backup',extensions:['tolouqcbackup']}]});
    if(selection.canceled||!selection.filePath)return{ok:true,data:{cancelled:true}};
    const userData=app.getPath('userData');const snapshot=join(userData,`backup-snapshot-${Date.now()}.sqlite`);const db=openDb();
    try{db.exec(`VACUUM INTO ${sqlString(snapshot)}`);}finally{db.close();}
    const envelope:BackupEnvelope={magic:BACKUP_MAGIC,version:BACKUP_VERSION,createdAt:new Date().toISOString(),database:(await readFile(snapshot)).toString('base64'),attachments:await collectFiles(join(userData,'attachments'))};
    await rm(snapshot,{force:true});await writeFile(selection.filePath,gzipSync(Buffer.from(JSON.stringify(envelope),'utf8')));
    return{ok:true,data:{cancelled:false,path:selection.filePath}};
  }catch(error){console.error('[Tolou backup]',error);return{ok:false,message:'تهیه نسخه پشتیبان انجام نشد.'};}
}

async function restoreBackup(event:IpcMainInvokeEvent):Promise<SystemResult<{cancelled:boolean;restarting:boolean}>>{
  try{
    const window=BrowserWindow.fromWebContents(event.sender);if(!window)throw new Error('پنجره برنامه در دسترس نیست');
    const selection=await dialog.showOpenDialog(window,{title:'بارگذاری نسخه پشتیبان طلوع',properties:['openFile'],filters:[{name:'Tolou QC Backup',extensions:['tolouqcbackup']}]});
    if(selection.canceled||!selection.filePaths[0])return{ok:true,data:{cancelled:true,restarting:false}};
    const raw=gunzipSync(await readFile(selection.filePaths[0]));const parsed=JSON.parse(raw.toString('utf8')) as BackupEnvelope;
    if(parsed.magic!==BACKUP_MAGIC||parsed.version!==BACKUP_VERSION||typeof parsed.database!=='string'||!Array.isArray(parsed.attachments))throw new Error('فایل نسخه پشتیبان معتبر نیست');
    const userData=app.getPath('userData');const stagedDb=join(userData,STAGED_DB);const stagedAttachments=join(userData,STAGED_ATTACHMENTS);
    await writeFile(stagedDb,Buffer.from(parsed.database,'base64'));
    const validation=new DatabaseSync(stagedDb,{readOnly:true});try{validation.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get();validation.prepare('SELECT id,name FROM companies LIMIT 1').get();}finally{validation.close();}
    await rm(stagedAttachments,{recursive:true,force:true});await mkdir(stagedAttachments,{recursive:true});
    for(const entry of parsed.attachments){if(typeof entry.path!=='string'||entry.path.includes('..')||entry.path.startsWith('/')||typeof entry.data!=='string')throw new Error('ساختار پیوست نسخه پشتیبان معتبر نیست');const target=join(stagedAttachments,...entry.path.split('/'));await mkdir(dirname(target),{recursive:true});await writeFile(target,Buffer.from(entry.data,'base64'));}
    await writeFile(join(userData,PENDING_MARKER),JSON.stringify({database:STAGED_DB,attachments:STAGED_ATTACHMENTS,createdAt:parsed.createdAt}),'utf8');
    setTimeout(()=>{app.relaunch();app.exit(0);},250);
    return{ok:true,data:{cancelled:false,restarting:true}};
  }catch(error){console.error('[Tolou restore]',error);return{ok:false,message:error instanceof Error&&/[\u0600-\u06FF]/u.test(error.message)?error.message:'بارگذاری نسخه پشتیبان انجام نشد.'};}
}

export function applyPendingRestore(userData:string){
  const marker=join(userData,PENDING_MARKER);if(!existsSync(marker))return;
  try{
    const data=JSON.parse(readFileSync(marker,'utf8')) as {database:string;attachments:string};
    const stagedDb=join(userData,basename(data.database));const stagedAttachments=join(userData,basename(data.attachments));const activeDb=join(userData,DB_NAME);const attachments=join(userData,'attachments');
    if(!existsSync(stagedDb))throw new Error('فایل پایگاه داده بازیابی یافت نشد');
    rmSync(activeDb,{force:true});renameSync(stagedDb,activeDb);rmSync(attachments,{recursive:true,force:true});if(existsSync(stagedAttachments))renameSync(stagedAttachments,attachments);rmSync(marker,{force:true});
  }catch(error){console.error('[Tolou pending restore]',error);throw error;}
}

app.whenReady().then(()=>{
  const register=(channel:string,handler:(event:IpcMainInvokeEvent,...args:any[])=>any)=>ipcMain.handle(channel,(event,...args)=>{if(!trusted(event))throw new Error('IPC sender rejected');return handler(event,...args);});
  register('system:company-profile:get',()=>safe(()=>readCompanyProfile()));
  register('system:company-profile:save',(_event,input)=>safe(()=>saveCompanyProfile(input)));
  register('system:backup:create',event=>createBackup(event));
  register('system:backup:restore',event=>restoreBackup(event));
});
