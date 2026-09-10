import { contextBridge, ipcRenderer } from 'electron';
import type { CreateSeriesInput, LaboratoryKind, SaveDraftInput, TolouBridge } from '../shared/ipc.js';

const channels = Object.freeze({
  appInfo: 'app:info',
  health: 'app:health',
  createSeries: 'laboratory:create-series',
  listSeries: 'laboratory:list-series',
  saveDraft: 'laboratory:save-draft',
});

const bridge: TolouBridge = Object.freeze({
  getAppInfo: () => ipcRenderer.invoke(channels.appInfo),
  health: () => ipcRenderer.invoke(channels.health),
  createSeries: (input: CreateSeriesInput) => ipcRenderer.invoke(channels.createSeries, input),
  listSeries: (kind: LaboratoryKind, projectId?: string) => ipcRenderer.invoke(channels.listSeries, { kind, projectId }),
  saveDraft: (input: SaveDraftInput) => ipcRenderer.invoke(channels.saveDraft, input),
});

contextBridge.exposeInMainWorld('tolou', bridge);
