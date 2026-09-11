import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import { readFile } from 'node:fs/promises';
import { randomUUID, sign } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=dirname(fileURLToPath(import.meta.url));
const ALLOWED_PLANS=new Set([3,6,12,24]);

function createWindow(){
  const win=new BrowserWindow({
    width:1120,height:780,minWidth:960,minHeight:680,show:false,
    backgroundColor:'#071522',title:'Tolou License Manager',autoHideMenuBar:true,
    webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  win.once('ready-to-show',()=>win.show());
  void win.loadFile(join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
}

function clean(value,max=160){return String(value??'').trim().slice(0,max);}
function machineId(value){const normalized=clean(value,80).toUpperCase();if(!/^[A-Z0-9-]{10,80}$/.test(normalized))throw new Error('کد دستگاه معتبر نیست.');return normalized;}
function planMonths(value){const plan=Number(value);if(!ALLOWED_PLANS.has(plan))throw new Error('مدت اشتراک معتبر نیست.');return plan;}

app.whenReady().then(()=>{
  ipcMain.handle('license-manager:select-key',async event=>{
    const win=BrowserWindow.fromWebContents(event.sender);if(!win)throw new Error('پنجره در دسترس نیست.');
    const selected=await dialog.showOpenDialog(win,{title:'انتخاب کلید خصوصی Tolou QC',properties:['openFile'],filters:[{name:'Private Key',extensions:['pem']}]});
    if(selected.canceled||!selected.filePaths[0])return{cancelled:true};
    return{cancelled:false,path:selected.filePaths[0]};
  });
  ipcMain.handle('license-manager:generate',async(_event,input)=>{
    const keyPath=clean(input?.keyPath,500);if(!keyPath)throw new Error('ابتدا Private Key را انتخاب کنید.');
    const machine=machineId(input?.machineId);const plan=planMonths(input?.planMonths);
    const customerName=clean(input?.customerName,160);const buyerName=clean(input?.buyerName,120);const buyerPhone=clean(input?.buyerPhone,40);
    const startAt=input?.startAt?new Date(input.startAt):new Date();if(Number.isNaN(startAt.getTime()))throw new Error('تاریخ شروع معتبر نیست.');
    const expiresAt=new Date(startAt);expiresAt.setUTCMonth(expiresAt.getUTCMonth()+plan);
    const payload={v:1,product:'tolou-concrete-qc',licenseId:randomUUID(),machineId:machine,planMonths:plan,issuedAt:startAt.toISOString(),expiresAt:expiresAt.toISOString(),...(customerName?{customerName}:{}),...(buyerName?{buyerName}:{}),...(buyerPhone?{buyerPhone}:{})};
    const bytes=Buffer.from(JSON.stringify(payload),'utf8');const privateKey=await readFile(keyPath);
    const signature=sign(null,bytes,privateKey).toString('base64url');const body=bytes.toString('base64url');
    return{productKey:`TLQ1.${body}.${signature}`,payload};
  });
  ipcMain.handle('license-manager:copy',(_event,text)=>{clipboard.writeText(String(text??''));return true;});
  createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>app.quit());
