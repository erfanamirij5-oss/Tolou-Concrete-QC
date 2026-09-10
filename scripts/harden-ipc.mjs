import { readFile, writeFile } from 'node:fs/promises';

const path='src/main/main.ts';
let source=await readFile(path,'utf8');
if(source.includes('function handleTrustedIpc(')) throw new Error('IPC hardening already applied');
source=source.replace("import { app, BrowserWindow, dialog, ipcMain } from 'electron';", "import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';");
const anchor="function safe<T>(operation:()=>T):IpcResult<T>{try{return{ok:true,data:operation()};}catch(error){return{ok:false,message:safeMessage(error)};}}\n";
const helper=`type TrustedIpcHandler=(event:IpcMainInvokeEvent,...args:any[])=>any;\nfunction isTrustedIpcSender(event:IpcMainInvokeEvent):boolean{const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}\nfunction handleTrustedIpc(channel:string,handler:TrustedIpcHandler):void{ipcMain.handle(channel,(event,...args)=>{if(!isTrustedIpcSender(event)){console.warn('[Tolou IPC] Rejected untrusted sender',channel,event.senderFrame?.url??'<destroyed>');throw new Error('IPC sender rejected');}return handler(event,...args);});}\n`;
if(!source.includes(anchor)) throw new Error('safe() anchor not found');
source=source.replace(anchor,anchor+helper);
source=source.replaceAll('ipcMain.handle(','handleTrustedIpc(');
// Restore the one intentional ipcMain.handle call inside the wrapper itself.
source=source.replace('function handleTrustedIpc(channel:string,handler:TrustedIpcHandler):void{handleTrustedIpc(channel,', 'function handleTrustedIpc(channel:string,handler:TrustedIpcHandler):void{ipcMain.handle(channel,');
if(source.includes('ipcMain.handle(IPC_CHANNELS.')) throw new Error('Unwrapped IPC handler remains');
await writeFile(path,source,'utf8');
