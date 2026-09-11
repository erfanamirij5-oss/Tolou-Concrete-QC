import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

let gameWindow:BrowserWindow|null=null;
function trusted(event:IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const owner=BrowserWindow.fromWebContents(event.sender);if(!owner)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}
function gamePath(){return join(app.getAppPath(),'dist-electron','games','tolou-batching-arcade.html');}

app.whenReady().then(()=>{
 ipcMain.handle('entertainment:launch-production-game',async event=>{
  if(!trusted(event))throw new Error('IPC sender rejected');
  const source=gamePath();if(!existsSync(source))return{ok:false,message:'فایل اصلی بازی در بسته نرم‌افزار یافت نشد.'};
  if(gameWindow&&!gameWindow.isDestroyed()){gameWindow.show();gameWindow.focus();gameWindow.setFullScreen(true);return{ok:true};}
  gameWindow=new BrowserWindow({show:false,fullscreen:true,autoHideMenuBar:true,backgroundColor:'#101e2d',title:'طلوع - مسئول بچینگ',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:!app.isPackaged}});
  gameWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  gameWindow.webContents.on('will-navigate',(navEvent,url)=>{try{if(new URL(url).protocol!=='file:')navEvent.preventDefault();}catch{navEvent.preventDefault();}});
  gameWindow.on('closed',()=>{gameWindow=null;});
  await gameWindow.loadFile(source);
  gameWindow.show();gameWindow.setFullScreen(true);gameWindow.focus();
  return{ok:true};
 });
});
