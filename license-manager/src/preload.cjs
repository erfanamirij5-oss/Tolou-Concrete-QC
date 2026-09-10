const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tolouLicenseManager', {
  getState: () => ipcRenderer.invoke('manager:state'),
  importKey: () => ipcRenderer.invoke('manager:import-key'),
  issueLicense: (input) => ipcRenderer.invoke('manager:issue-license', input)
});
