import type { IpcResult } from '../shared/ipc';

declare global {
  interface Window {
    tolouSystem: {
      getCompanyProfile(): Promise<IpcResult<unknown>>;
    };
  }
}

export {};
