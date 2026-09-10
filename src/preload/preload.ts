import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type TolouBridge } from '../shared/ipc.js';

const bridge: TolouBridge = Object.freeze({
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appInfo),
  health: () => ipcRenderer.invoke(IPC_CHANNELS.health),
});

contextBridge.exposeInMainWorld('tolou', bridge);
