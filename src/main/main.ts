import { app, BrowserWindow, ipcMain } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseRuntime, type DatabaseRuntime } from './database.js';
import {
  IPC_CHANNELS,
  type AppInfo,
  type CreateSeriesInput,
  type DraftResult,
  type HealthStatus,
  type IpcResult,
  type LaboratoryKind,
  type SaveDraftInput,
  type SeriesSummary,
  type CreateSeriesResult,
} from '../shared/ipc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let runtime: DatabaseRuntime | undefined;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    backgroundColor: '#F5F6F8',
    title: 'طلوع | کنترل کیفیت بتن',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  window.once('ready-to-show', () => window.show());
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) void window.loadURL(devServer);
  else void window.loadFile(join(__dirname, '../../dist-renderer/index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  return window;
}

function safe<T>(operation: () => T): IpcResult<T> {
  try {
    return { ok: true, data: operation() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'عملیات انجام نشد';
    return { ok: false, message };
  }
}

function registerIpc(database: DatabaseRuntime): void {
  ipcMain.handle(IPC_CHANNELS.appInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    locale: app.getLocale(),
  }));

  ipcMain.handle(IPC_CHANNELS.health, (): HealthStatus => ({
    ok: true,
    timestamp: new Date().toISOString(),
    database: 'ready',
  }));

  ipcMain.handle(IPC_CHANNELS.createSeries, (_event, input: CreateSeriesInput): IpcResult<CreateSeriesResult> =>
    safe(() => database.laboratory.createSeries(input) as CreateSeriesResult));

  ipcMain.handle(IPC_CHANNELS.listSeries, (_event, input: { kind: LaboratoryKind; projectId?: string }): IpcResult<SeriesSummary[]> =>
    safe(() => database.laboratory.listSeries(input) as SeriesSummary[]));

  ipcMain.handle(IPC_CHANNELS.saveDraft, (_event, input: SaveDraftInput): IpcResult<DraftResult> =>
    safe(() => database.laboratory.saveDraft(input) as DraftResult));
}

app.whenReady().then(() => {
  runtime = createDatabaseRuntime();
  registerIpc(runtime);
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  runtime?.db.close();
  runtime = undefined;
});

app.on('window-all-closed', () => app.quit());
