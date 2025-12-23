import { BrowserWindow, MessageChannelMain } from 'electron';
import { ILogger } from '@/infrastructure/logger';
import { ManagedPort } from './ManagedPort';
import { IPC_CHANNELS } from '@/core/window/constants';

/**
 * PortManager - Manages window message ports
 * PortManager - 管理窗口消息端口
 */
export class PortManager {
  private ports: Map<string, ManagedPort> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Register a port for a window
   * 为窗口注册端口
   * @param windowId Window ID
   * @param window BrowserWindow instance
   * @param onMessage Message handler callback
   */
  register(
    windowId: string,
    window: BrowserWindow,
    onMessage: (msg: any, port: ManagedPort) => void
  ): void {
    this.unregister(windowId);

    const { port1, port2 } = new MessageChannelMain();
    const managedPort = new ManagedPort(port1);
    this.ports.set(windowId, managedPort);

    // Listen for messages
    port1.on('message', (event) => {
      let msg: any;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch (error) {
        this.logger.error(`Failed to parse message from window ${windowId}: ${error}`);
        return;
      }

      onMessage(msg, managedPort);
    });
    port1.start();

    // Inject port
    const injectPort = () => {
      try {
        window.webContents.postMessage(IPC_CHANNELS.MESSAGE_BUS_PORT, null, [port2]);
      } catch (error) {
        this.logger.error(`Failed to post message to window ${windowId}: ${error}`);
        // Cleanup
        managedPort.close();
        this.ports.delete(windowId);
      }
    };

    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', injectPort);
    } else {
      injectPort();
    }
  }

  /**
   * Unregister a window port
   * 注销窗口端口
   */
  unregister(windowId: string): boolean {
    const port = this.ports.get(windowId);
    if (port) {
      port.close();
      this.ports.delete(windowId);
      return true;
    }
    return false;
  }

  /**
   * Get a managed port
   * 获取托管端口
   */
  get(windowId: string): ManagedPort | undefined {
    return this.ports.get(windowId);
  }

  /**
   * Broadcast message to specific windows or all windows
   * 广播消息到指定窗口或所有窗口
   * @param message Serialized message string
   * @param windowIds Target window IDs (optional)
   */
  broadcast(message: string, windowIds?: string[]): number {
    let successCount = 0;
    const targets = windowIds || Array.from(this.ports.keys());

    targets.forEach((id) => {
      const port = this.ports.get(id);
      if (port) {
        try {
          if (port.postMessage(message)) {
            successCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to broadcast to window ${id}: ${error}`);
        }
      }
    });

    return successCount;
  }

  /**
   * Dispose all ports
   * 释放所有端口
   */
  dispose(): void {
    this.ports.forEach((port) => port.close());
    this.ports.clear();
  }

  /**
   * Get all registered window IDs
   * 获取所有已注册的窗口 ID
   */
  getAllWindowIds(): string[] {
    return Array.from(this.ports.keys());
  }
}
