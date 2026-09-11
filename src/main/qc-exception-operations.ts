import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createQcExceptionService } from '../application/qc-exceptions.js';
import { createQcExceptionSyncService } from '../application/qc-exception-sync.js';

const COMPANY_ID='tolou-local-company',DB_NAME='tolou-qc.sqlite',ACTOR='کاربر محلی';
type Result<T>={ok:true;data:T}|{ok:false;message:string};
function trusted(event:IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}
function safe<T>(operation:()=>T):Result<T>{try{return{ok:true,data:operation()};}catch(error){console.error('[Tolou exceptions]',error);return{ok:false,message:error instanceof Error&&/[\u0600-\u06FF]/u.test(error.message)?error.message:'عملیات هشدار QC انجام نشد.'};}}
function withDb<T>(operation:(db:DatabaseSync)=>T){const db=new DatabaseSync(join(app.getPath('userData'),DB_NAME));try{db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');return operation(db);}finally{db.close();}}
function withService<T>(operation:(service:ReturnType<typeof createQcExceptionService>)=>T){return withDb(db=>operation(createQcExceptionService(db,{companyId:COMPANY_ID,actor:ACTOR})));}
app.whenReady().then(()=>{const register=(channel:string,handler:(event:IpcMainInvokeEvent,...args:any[])=>any)=>ipcMain.handle(channel,(event,...args)=>{if(!trusted(event))throw new Error('IPC sender rejected');return handler(event,...args);});register('qc-exceptions:list',(_e,input={})=>safe(()=>withService(s=>s.list(input))));register('qc-exceptions:get',(_e,key:string)=>safe(()=>withService(s=>s.get(key))));register('qc-exceptions:open',(_e,input)=>safe(()=>withService(s=>s.open(input))));register('qc-exceptions:acknowledge',(_e,input:{exceptionKey:string;reason:string})=>safe(()=>withService(s=>s.acknowledge(input.exceptionKey,input.reason))));register('qc-exceptions:resolve',(_e,input:{exceptionKey:string;reason:string})=>safe(()=>withService(s=>s.resolve(input.exceptionKey,input.reason))));register('qc-exceptions:history',(_e,key:string)=>safe(()=>withService(s=>s.history(key))));register('qc-exceptions:sync',()=>safe(()=>withDb(db=>createQcExceptionSyncService(db,{companyId:COMPANY_ID,actor:ACTOR}).sync())));});
