export interface IpcRendererBindings {
  invoke: <T = unknown>(name: string, payload?: unknown) => Promise<T>;
  sendSync: <T = unknown>(name: string, payload?: unknown) => T;
  [key: string]: any;
}

export interface PreloadConfig {
  channel?: string;
  syncChannel?: string;
  /**
   * API Key to expose in window object
   * 暴露在 window 对象上的 API 键名
   * @default 'ipcApi'
   */
  apiKey?: string;
}
