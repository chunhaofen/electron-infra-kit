import { BrowserWindow, ipcMain } from 'electron';
import { ITransport } from './ITransport';
import { ILogger } from '@/infrastructure/logger';

// Use a dedicated channel for IPC transport
const IPC_CHANNEL = 'message-bus-ipc';

export class IpcTransport implements ITransport {
  public readonly name = 'ipc';
  private logger: ILogger;
  private windows: Map<string, BrowserWindow> = new Map();
  private onMessage?: (message: any, windowId: string) => void;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.setupIpcListener();
  }

  private setupIpcListener() {
    ipcMain.on(IPC_CHANNEL, (event, payload) => {
      const windowId = this.findWindowId(event.sender.id);
      if (windowId && this.onMessage) {
        this.onMessage(payload, windowId);
      }
    });
  }

  private findWindowId(webContentsId: number): string | undefined {
    for (const [id, win] of this.windows.entries()) {
      if (win.webContents.id === webContentsId) return id;
    }
    return undefined;
  }

  init(onMessage: (message: any, windowId: string) => void): void {
    this.onMessage = onMessage;
  }

  registerWindow(windowId: string, window: BrowserWindow): void {
    this.windows.set(windowId, window);
  }

  unregisterWindow(windowId: string): void {
    this.windows.delete(windowId);
  }

  send(windowId: string, message: any): void {
    const window = this.windows.get(windowId);
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC_CHANNEL, message);
    }
  }

  broadcast(message: any, windowIds?: string[]): number {
    let count = 0;
    const targets = windowIds || Array.from(this.windows.keys());
    for (const id of targets) {
      try {
        this.send(id, message);
        count++;
      } catch (e) {
        this.logger.error(`Failed to send IPC message to ${id}`, e);
      }
    }
    return count;
  }

  dispose(): void {
    this.windows.clear();
    ipcMain.removeAllListeners(IPC_CHANNEL);
  }
}
