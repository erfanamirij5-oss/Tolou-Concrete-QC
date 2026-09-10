import { contextBridge, ipcRenderer } from 'electron';
import type { ApproveDraftInput, CreateMixDesignInput, CreateMixVersionInput, CreatePourInput, CreateProjectInput, CreateSeriesInput, LaboratoryKind, SaveDraftInput, SavePourSpecificationInput, TolouBridge } from '../shared/ipc.js';
const channels=Object.freeze({appInfo:'app:info',health:'app:health',createSeries:'laboratory:create-series',listSeries:'laboratory:list-series',saveDraft:'laboratory:save-draft',listSamples:'laboratory:list-samples',approveDraft:'laboratory:approve-draft',resultHistory:'laboratory:result-history',createProject:'projects:create',listProjects:'projects:list',createPour:'pours:create',listPours:'pours:list',dashboard:'dashboard:summary',createMixDesign:'engineering:create-mix-design',listMixDesigns:'engineering:list-mix-designs',createMixVersion:'engineering:create-mix-version',listMixVersions:'engineering:list-mix-versions',savePourSpecification:'engineering:save-pour-specification',getPourSpecification:'engineering:get-pour-specification'});
const bridge:TolouBridge=Object.freeze({
 getAppInfo:()=>ipcRenderer.invoke(channels.appInfo),health:()=>ipcRenderer.invoke(channels.health),
 createSeries:(input:CreateSeriesInput)=>ipcRenderer.invoke(channels.createSeries,input),listSeries:(kind:LaboratoryKind,projectId?:string)=>ipcRenderer.invoke(channels.listSeries,{kind,projectId}),saveDraft:(input:SaveDraftInput)=>ipcRenderer.invoke(channels.saveDraft,input),
 listSamples:(limit?:number)=>ipcRenderer.invoke(channels.listSamples,limit),approveDraft:(input:ApproveDraftInput)=>ipcRenderer.invoke(channels.approveDraft,input),resultHistory:(sampleId:string)=>ipcRenderer.invoke(channels.resultHistory,sampleId),
 createProject:(input:CreateProjectInput)=>ipcRenderer.invoke(channels.createProject,input),listProjects:()=>ipcRenderer.invoke(channels.listProjects),
 createPour:(input:CreatePourInput)=>ipcRenderer.invoke(channels.createPour,input),listPours:(projectId:string)=>ipcRenderer.invoke(channels.listPours,projectId),dashboard:()=>ipcRenderer.invoke(channels.dashboard),
 createMixDesign:(input:CreateMixDesignInput)=>ipcRenderer.invoke(channels.createMixDesign,input),listMixDesigns:()=>ipcRenderer.invoke(channels.listMixDesigns),
 createMixVersion:(input:CreateMixVersionInput)=>ipcRenderer.invoke(channels.createMixVersion,input),listMixVersions:(mixDesignId:string)=>ipcRenderer.invoke(channels.listMixVersions,mixDesignId),
 savePourSpecification:(input:SavePourSpecificationInput)=>ipcRenderer.invoke(channels.savePourSpecification,input),getPourSpecification:(pourId:string)=>ipcRenderer.invoke(channels.getPourSpecification,pourId),
});
contextBridge.exposeInMainWorld('tolou',bridge);
