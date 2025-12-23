import { IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import IpcTransportClass from '@/core/ipc/transport';
import { IIpcTransport } from '@/core/ipc/transport/ipc.type';
import type IpcRouter from '@/core/ipc/IpcRouter';
import { IpcRequest } from '@/core/ipc/ipc-router.type';
import { WindowManagerConfig } from './window-manager.type';
import { IPC_CHANNELS } from './constants';

export interface IpcSetupOptions {
  config: WindowManagerConfig;
  ipcRouter: IpcRouter;
  currentIpcChannel?: string | null;
  currentIpcSyncChannel?: string | null;
  options?: { channel?: string; syncChannel?: string };
  /**
   * Optional IpcTransport instance, if not provided, a new instance will be created.
   * 可选的 IpcTransport 实例，如果未提供，将创建一个新实例。
   */
  ipcTransport?: IIpcTransport;
}

export interface IpcSetupResult {
  channel: string;
  syncChannel: string;
  /**
   * The IpcTransport instance used.
   * 使用的 IpcTransport 实例。
   */
  ipcTransport: IIpcTransport;
}

/**
 * Responsible for IPC registration logic of WindowManager
 * 负责 WindowManager 的 IPC 注册逻辑
 */
export class IpcSetup {
  /**
   * Default IPC setup implementation
   * 默认 IPC 设置实现
   * @param windowManager - WindowManager instance
   * @param options - IPC options
   */
  static defaultSetup(
    windowManager: any,
    options?: { channel?: string; syncChannel?: string }
  ): IpcSetupResult {
    return IpcSetup.setup({
      config: windowManager.config,
      ipcRouter: windowManager.ipcRouter,
      currentIpcChannel: windowManager.currentIpcChannel,
      currentIpcSyncChannel: windowManager.currentIpcSyncChannel,
      options,
    });
  }

  /**
   * Setup IPC communication
   * 设置 IPC 通信
   * @param params - Parameter object (参数对象)
   * @returns Registered channel names (注册的频道名称)
   */
  static setup(params: IpcSetupOptions): IpcSetupResult {
    const { config, ipcRouter, currentIpcChannel, currentIpcSyncChannel, options } = params;

    // Use provided instance or create new one
    // 使用提供的实例或创建新实例
    const ipcTransport = params.ipcTransport || new IpcTransportClass();

    const channel = options?.channel || config.ipc?.channel || IPC_CHANNELS.RENDERER_TO_MAIN;
    const syncChannel =
      options?.syncChannel || config.ipc?.syncChannel || IPC_CHANNELS.RENDERER_TO_MAIN_SYNC;

    // Clean up old listeners (if exist)
    // 清理旧的监听器 (如果存在)
    if (currentIpcChannel) {
      ipcTransport.removeHandler(currentIpcChannel);
    }
    if (currentIpcSyncChannel) {
      ipcTransport.removeListener(currentIpcSyncChannel);
    }

    ipcTransport.handle(channel, async (event: IpcMainInvokeEvent, data) => {
      try {
        const senderId = event.sender?.id;
        const result = await ipcRouter.handle(data as IpcRequest, senderId);
        return {
          code: 0,
          message: 'success',
          data: result,
        };
      } catch (error) {
        return {
          code: (error as any).code || 500,
          message: error instanceof Error ? error.message : String(error),
          data: null,
        };
      }
    });

    /**
     * @deprecated
     * Sync IPC is not recommended as it blocks the renderer process.
     * Use async 'invoke' instead.
     * 同步 IPC 不推荐使用，因为它会阻塞渲染进程。
     * 请改用异步 'invoke'。
     */
    if (syncChannel) {
      ipcTransport.on(syncChannel, (event: IpcMainEvent, data) => {
        try {
          const result = ipcRouter.handle(data as IpcRequest); // Call IPC handler / 调用IPC处理函数
          // Wrap result in standard response
          // 将结果包装在标准响应中
          event.returnValue = {
            code: 0,
            message: 'success',
            data: result,
          };
        } catch (error) {
          // Wrap error in standard response
          // 将错误包装在标准响应中
          event.returnValue = {
            code: (error as any).code || 500,
            message: error instanceof Error ? error.message : String(error),
            data: null,
          };
        }
      });
    }

    return {
      channel,
      syncChannel,
      ipcTransport,
    };
  }
}
