import type { TolouBridge } from '../shared/ipc';

declare global {
  interface Window {
    tolou: TolouBridge;
  }
}

export {};
