import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createManagementAnalyticsService } from '../application/management-analytics.js';

const COMPANY_ID='tolou-local-company';
const DB_NAME='tolou-qc.sqlite';

type ManagementInput={projectId?:string|null;startAt?:string|null;endAt?:string|null};
type SystemResult<T>={ok:true;data:T}|{ok:false;message:string};

function trusted(event:IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}
function safe<T>(operation:()=>T):SystemResult<T>{try{return{ok:true,data:operation()};}catch(error){console.error('[Tolou management]',error);return{ok:false,message:error instanceof Error&&/[\u0600-\u06FF]/u.test(error.message)?error.message:'تحلیل مدیریتی انجام نشد.'};}}
function withService<T>(operation:(service:ReturnType<typeof createManagementAnalyticsService>)=>T){const db=new DatabaseSync(join(app.getPath('userData'),DB_NAME),{readOnly:true});try{return operation(createManagementAnalyticsService(db,{companyId:COMPANY_ID}));}finally{db.close();}}

app.whenReady().then(()=>{
 const register=(channel:string,handler:(event:IpcMainInvokeEvent,...args:any[])=>any)=>ipcMain.handle(channel,(event,...args)=>{if(!trusted(event))throw new Error('IPC sender rejected');return handler(event,...args);});
 register('management:summary',(_event,input:ManagementInput={})=>safe(()=>withService(service=>service.summary(input))));
 register('management:dataset',(_event,input:ManagementInput={})=>safe(()=>withService(service=>service.dataset(input))));
});
