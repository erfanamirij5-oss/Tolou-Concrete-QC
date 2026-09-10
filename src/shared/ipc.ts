export const IPC_CHANNELS = {
  appInfo: 'app:info',
  health: 'app:health',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  locale: string;
}

export interface HealthStatus {
  ok: true;
  timestamp: string;
}

export interface TolouBridge {
  getAppInfo(): Promise<AppInfo>;
  health(): Promise<HealthStatus>;
}
