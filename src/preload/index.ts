import { ipcRenderer, contextBridge } from 'electron';
import { IpcRendererBindings, PreloadConfig } from './preload.type';
import { IPC_CHANNELS } from '@/core/window/constants';
export * from './preload.type';

/**
 * IpcRendererBridge - Secure IPC Bridge for Renderer Process
 * IpcRendererBridge - 渲染进程的安全 IPC 桥接器
 */
export class IpcRendererBridge {
  private bindings: IpcRendererBindings;
  private channel: string = IPC_CHANNELS.RENDERER_TO_MAIN;
  private syncChannel: string = IPC_CHANNELS.RENDERER_TO_MAIN_SYNC;

  constructor() {
    this.bindings = {
      invoke: this.invoke.bind(this),
      sendSync: this.sendSync.bind(this),
    };
  }

  /**
   * Configure the IPC channels
   * 配置 IPC 频道
   * @param config - The configuration object
   */
  public configure(config: PreloadConfig): void {
    if (config.channel) {
      this.channel = config.channel;
    }
    if (config.syncChannel) {
      this.syncChannel = config.syncChannel;
    }
  }

  /**
   * Send an asynchronous message to the main process
   * 发送异步消息到主进程
   * @param name - Handler name (处理器名称)
   * @param payload - Data payload (数据负载)
   */
  private invoke = async <T = unknown>(name: string, payload?: unknown): Promise<T> => {
    const response = await ipcRenderer.invoke(this.channel, {
      name,
      payload,
    });

    // Automatic unwrapping of standard response format
    // 自动解包标准响应格式
    if (response && typeof response === 'object' && 'code' in response) {
      if (response.code === 200) {
        return response.data as T;
      }
      throw new Error(response.message || `IPC Error: ${response.code}`);
    }

    return response as T;
  };

  /**
   * Send a synchronous message to the main process
   * 发送同步消息到主进程
   * @param name - Handler name (处理器名称)
   * @param payload - Data payload (数据负载)
   */
  private sendSync = <T = unknown>(name: string, payload?: unknown): T => {
    const response = ipcRenderer.sendSync(this.syncChannel, {
      name,
      payload,
    });

    // Automatic unwrapping of standard response format
    // 自动解包标准响应格式
    if (response && typeof response === 'object' && 'code' in response) {
      if (response.code === 200) {
        return response.data as T;
      }
      throw new Error(response.message || `IPC Error: ${response.code}`);
    }

    return response as T;
  };

  /**
   * Get the bindings object
   * 获取绑定对象
   */
  public getBindings(): IpcRendererBindings {
    return this.bindings;
  }

  /**
   * Expose API to the main world using contextBridge
   * 使用 contextBridge 将 API 暴露给主世界
   * @param apiKey - The key to expose on window object (default: 'ipcApi')
   */
  public exposeApi(apiKey: string = 'ipcApi'): void {
    try {
      contextBridge.exposeInMainWorld(apiKey, this.bindings);
    } catch (error) {
      console.error('[IpcRendererBridge] Failed to expose API:', error);
    }
  }
}

const ipcRendererBridge = new IpcRendererBridge();
export { ipcRendererBridge };
