import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

let gameWindow:BrowserWindow|null=null;
const GAME_NAMES=new Set(['Tolou-Batching-Arcade.html','Tolou-Batching-Arcade(1).html','Tolou-Batching-Arcade(2).html','tolou-batching-arcade.html']);
function trusted(event:IpcMainInvokeEvent){const frame=event.senderFrame;if(!frame||frame!==event.sender.mainFrame)return false;const owner=BrowserWindow.fromWebContents(event.sender);if(!owner)return false;const devServer=process.env.VITE_DEV_SERVER_URL;if(devServer)return frame.url.startsWith(devServer);try{return new URL(frame.url).protocol==='file:';}catch{return false;}}
function bundledGamePath(){return join(app.getAppPath(),'dist-electron','games','tolou-batching-arcade.html');}
function managedGamePath(){return join(app.getPath('userData'),'games','tolou-batching-arcade.html');}
function findCompanion(root:string,depth=0):string|null{if(depth>2||!existsSync(root))return null;try{for(const entry of readdirSync(root,{withFileTypes:true})){if(entry.isFile()&&GAME_NAMES.has(entry.name))return join(root,entry.name);if(entry.isDirectory()&&depth<2){const found=findCompanion(join(root,entry.name),depth+1);if(found)return found;}}}catch{}return null;}
function importGame(source:string){const managed=managedGamePath();mkdirSync(dirname(managed),{recursive:true});copyFileSync(source,managed);return managed;}
async function resolveGamePath(owner:BrowserWindow|null){const bundled=bundledGamePath();if(existsSync(bundled))return bundled;const managed=managedGamePath();if(existsSync(managed))return managed;for(const key of ['downloads','desktop'] as const){const companion=findCompanion(app.getPath(key));if(companion)return importGame(companion);}const choice=await dialog.showOpenDialog(owner??undefined,{title:'انتخاب فایل اصلی بازی طلوع',properties:['openFile'],filters:[{name:'Tolou HTML Game',extensions:['html','htm']}]});if(choice.canceled||!choice.filePaths[0])return null;return importGame(choice.filePaths[0]);}

app.whenReady().then(()=>{
 ipcMain.handle('entertainment:launch-production-game',async event=>{
  if(!trusted(event))throw new Error('IPC sender rejected');
  if(gameWindow&&!gameWindow.isDestroyed()){gameWindow.show();gameWindow.focus();gameWindow.setFullScreen(true);return{ok:true};}
  const owner=BrowserWindow.fromWebContents(event.sender);const source=await resolveGamePath(owner);if(!source)return{ok:false,message:'اجرای بازی لغو شد.'};
  gameWindow=new BrowserWindow({show:false,fullscreen:true,autoHideMenuBar:true,backgroundColor:'#101e2d',title:'طلوع - مسئول بچینگ',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:!app.isPackaged}});
  gameWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  gameWindow.webContents.on('will-navigate',(navEvent,url)=>{try{if(new URL(url).protocol!=='file:')navEvent.preventDefault();}catch{navEvent.preventDefault();}});
  gameWindow.on('closed',()=>{gameWindow=null;});
  await gameWindow.loadFile(source);gameWindow.show();gameWindow.setFullScreen(true);gameWindow.focus();return{ok:true};
 });
});
