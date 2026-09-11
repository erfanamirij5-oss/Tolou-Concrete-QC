import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createStatisticalQcService } from '../application/statistical-qc.js';

const COMPANY_ID='tolou-local-company';
const DB_NAME='tolou-qc.sqlite';
type Input={projectId?:string|null;concreteSourceId?:string|null;mixVersionId?:string|null;concreteClass?:string|null;ageDays?:number|null;startAt?:string|null;endAt?:string|null};
type Result<T>={ok:true;data:T}|{ok:false;message:string};
function trusted(event:IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}
function safe<T>(operation:()=>T):Result<T>{try{return{ok:true,data:operation()};}catch(error){console.error('[Tolou statistical QC]',error);return{ok:false,message:error instanceof Error&&/[\u0600-\u06FF]/u.test(error.message)?error.message:'تحلیل آماری انجام نشد.'};}}
function withService<T>(operation:(service:ReturnType<typeof createStatisticalQcService>)=>T){const db=new DatabaseSync(join(app.getPath('userData'),DB_NAME),{readOnly:true});try{return operation(createStatisticalQcService(db,{companyId:COMPANY_ID}));}finally{db.close();}}
app.whenReady().then(()=>{ipcMain.handle('statistical-qc:analyze',(event,input:Input={})=>{if(!trusted(event))throw new Error('IPC sender rejected');return safe(()=>withService(service=>service.analyze(input)));});});
