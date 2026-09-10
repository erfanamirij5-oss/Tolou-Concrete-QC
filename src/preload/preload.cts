import { contextBridge, ipcRenderer } from 'electron';
import type { CreatePourInput, CreateProjectInput, CreateSeriesInput, LaboratoryKind, SaveDraftInput, TolouBridge } from '../shared/ipc.js';
const channels=Object.freeze({appInfo:'app:info',health:'app:health',createSeries:'laboratory:create-series',listSeries:'laboratory:list-series',saveDraft:'laboratory:save-draft',createProject:'projects:create',listProjects:'projects:list',createPour:'pours:create',listPours:'pours:list',dashboard:'dashboard:summary'});
const bridge:TolouBridge=Object.freeze({
 getAppInfo:()=>ipcRenderer.invoke(channels.appInfo),health:()=>ipcRenderer.invoke(channels.health),
 createSeries:(input:CreateSeriesInput)=>ipcRenderer.invoke(channels.createSeries,input),listSeries:(kind:LaboratoryKind,projectId?:string)=>ipcRenderer.invoke(channels.listSeries,{kind,projectId}),saveDraft:(input:SaveDraftInput)=>ipcRenderer.invoke(channels.saveDraft,input),
 createProject:(input:CreateProjectInput)=>ipcRenderer.invoke(channels.createProject,input),listProjects:()=>ipcRenderer.invoke(channels.listProjects),
 createPour:(input:CreatePourInput)=>ipcRenderer.invoke(channels.createPour,input),listPours:(projectId:string)=>ipcRenderer.invoke(channels.listPours,projectId),dashboard:()=>ipcRenderer.invoke(channels.dashboard),
});
contextBridge.exposeInMainWorld('tolou',bridge);
