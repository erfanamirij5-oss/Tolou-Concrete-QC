import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createRuleProfileService } from '../application/rule-profiles.js';
import { createRuleEvaluationService } from '../application/rule-evaluation.js';

const COMPANY_ID='tolou-local-company';
const LOCAL_ACTOR='کاربر محلی';
const DB_NAME='tolou-qc.sqlite';
type SystemResult<T>={ok:true;data:T}|{ok:false;message:string};

function trusted(event:IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}
function safe<T>(operation:()=>T):SystemResult<T>{try{return{ok:true,data:operation()};}catch(error){console.error('[Tolou rules]',error);return{ok:false,message:error instanceof Error&&/[\u0600-\u06FF]/u.test(error.message)?error.message:'عملیات Rule Profile انجام نشد.'};}}
function withDb<T>(operation:(db:DatabaseSync)=>T){const db=new DatabaseSync(join(app.getPath('userData'),DB_NAME));try{return operation(db);}finally{db.close();}}

app.whenReady().then(()=>{
 const register=(channel:string,handler:(event:IpcMainInvokeEvent,...args:any[])=>any)=>ipcMain.handle(channel,(event,...args)=>{if(!trusted(event))throw new Error('IPC sender rejected');return handler(event,...args);});
 register('rules:profiles:list',()=>safe(()=>withDb(db=>createRuleProfileService(db,{companyId:COMPANY_ID,actor:LOCAL_ACTOR}).listProfiles())));
 register('rules:profiles:get',(_event,profileId:string)=>safe(()=>withDb(db=>createRuleProfileService(db,{companyId:COMPANY_ID,actor:LOCAL_ACTOR}).getProfile(profileId))));
 register('rules:project-assignment:get',(_event,projectId:string)=>safe(()=>withDb(db=>createRuleEvaluationService(db,{companyId:COMPANY_ID,actor:LOCAL_ACTOR}).getProjectAssignment(projectId))));
 register('rules:project-assignment:set',(_event,input:{projectId:string;profileId:string})=>safe(()=>withDb(db=>createRuleEvaluationService(db,{companyId:COMPANY_ID,actor:LOCAL_ACTOR}).assignProfile(input))));
 register('rules:evaluate-result',(_event,input:{sampleId:string;resultRevision:number})=>safe(()=>withDb(db=>createRuleEvaluationService(db,{companyId:COMPANY_ID,actor:LOCAL_ACTOR}).evaluateResult(input))));
 register('rules:evaluation:get',(_event,evaluationId:string)=>safe(()=>withDb(db=>createRuleEvaluationService(db,{companyId:COMPANY_ID,actor:LOCAL_ACTOR}).getEvaluation(evaluationId))));
});
