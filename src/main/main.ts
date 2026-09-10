import { app, BrowserWindow, ipcMain } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseRuntime, type DatabaseRuntime } from './database.js';
import { IPC_CHANNELS, type AppInfo, type ApproveDraftInput, type CreatePourInput, type CreateProjectInput, type CreateSeriesInput, type DraftResult, type HealthStatus, type IpcResult, type LaboratoryKind, type SaveDraftInput, type SeriesSummary, type CreateSeriesResult, type SampleSummary, type ApprovalResult, type ResultRevision } from '../shared/ipc.js';
const __dirname=dirname(fileURLToPath(import.meta.url)); let runtime:DatabaseRuntime|undefined;
function createMainWindow():BrowserWindow{const window=new BrowserWindow({width:1440,height:900,minWidth:1180,minHeight:720,show:false,backgroundColor:'#F5F6F8',title:'طلوع | کنترل کیفیت بتن',autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'../preload/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:!app.isPackaged}});window.once('ready-to-show',()=>window.show());const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)void window.loadURL(devServer);else void window.loadFile(join(__dirname,'../../dist-renderer/index.html'));window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(!devServer||!url.startsWith(devServer))event.preventDefault();});return window;}
function safe<T>(operation:()=>T):IpcResult<T>{try{return{ok:true,data:operation()};}catch(error){return{ok:false,message:error instanceof Error?error.message:'عملیات انجام نشد'};}}
function registerIpc(database:DatabaseRuntime):void{
 ipcMain.handle(IPC_CHANNELS.appInfo,():AppInfo=>({name:app.getName(),version:app.getVersion(),platform:process.platform,locale:app.getLocale()}));
 ipcMain.handle(IPC_CHANNELS.health,():HealthStatus=>({ok:true,timestamp:new Date().toISOString(),database:'ready'}));
 ipcMain.handle(IPC_CHANNELS.createSeries,(_e,input:CreateSeriesInput):IpcResult<CreateSeriesResult>=>safe(()=>database.laboratory.createSeries(input) as CreateSeriesResult));
 ipcMain.handle(IPC_CHANNELS.listSeries,(_e,input:{kind:LaboratoryKind;projectId?:string}):IpcResult<SeriesSummary[]>=>safe(()=>database.laboratory.listSeries(input) as SeriesSummary[]));
 ipcMain.handle(IPC_CHANNELS.saveDraft,(_e,input:SaveDraftInput):IpcResult<DraftResult>=>safe(()=>database.laboratory.saveDraft(input) as DraftResult));
 ipcMain.handle(IPC_CHANNELS.listSamples,(_e,limit?:number):IpcResult<SampleSummary[]>=>safe(()=>database.laboratory.listSamples({limit}) as SampleSummary[]));
 ipcMain.handle(IPC_CHANNELS.approveDraft,(_e,input:ApproveDraftInput):IpcResult<ApprovalResult>=>safe(()=>database.laboratory.approveDraft(input) as ApprovalResult));
 ipcMain.handle(IPC_CHANNELS.resultHistory,(_e,sampleId:string):IpcResult<ResultRevision[]>=>safe(()=>database.laboratory.listResultHistory(sampleId) as ResultRevision[]));
 ipcMain.handle(IPC_CHANNELS.createProject,(_e,input:CreateProjectInput)=>safe(()=>database.projects.createProject(input)));
 ipcMain.handle(IPC_CHANNELS.listProjects,()=>safe(()=>database.projects.listProjects()));
 ipcMain.handle(IPC_CHANNELS.createPour,(_e,input:CreatePourInput)=>safe(()=>database.projects.createPour(input)));
 ipcMain.handle(IPC_CHANNELS.listPours,(_e,projectId:string)=>safe(()=>database.projects.listPours(projectId)));
 ipcMain.handle(IPC_CHANNELS.dashboard,()=>safe(()=>database.projects.dashboard()));
}
app.whenReady().then(()=>{runtime=createDatabaseRuntime();registerIpc(runtime);createMainWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createMainWindow();});});
app.on('before-quit',()=>{runtime?.db.close();runtime=undefined;}); app.on('window-all-closed',()=>app.quit());
