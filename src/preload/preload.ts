import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type CreateSeriesInput, type LaboratoryKind, type SaveDraftInput, type TolouBridge } from '../shared/ipc.js';

const bridge: TolouBridge = Object.freeze({
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appInfo),
  health: () => ipcRenderer.invoke(IPC_CHANNELS.health),
  createSeries: (input: CreateSeriesInput) => ipcRenderer.invoke(IPC_CHANNELS.createSeries, input),
  listSeries: (kind: LaboratoryKind, projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.listSeries, { kind, projectId }),
  saveDraft: (input: SaveDraftInput) => ipcRenderer.invoke(IPC_CHANNELS.saveDraft, input),
});

contextBridge.exposeInMainWorld('tolou', bridge);
