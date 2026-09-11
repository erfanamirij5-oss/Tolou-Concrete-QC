const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tolouLicenseManager',Object.freeze({
  selectPrivateKey:()=>ipcRenderer.invoke('license-manager:select-key'),
  generateLicense:(input)=>ipcRenderer.invoke('license-manager:generate',input),
  copyText:(text)=>ipcRenderer.invoke('license-manager:copy',text)
}));
