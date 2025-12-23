import { BrowserWindow } from 'electron';
import { ITransport } from './ITransport';
import { PortManager } from '../core/PortManager';
import { ILogger } from '@/infrastructure/logger';

export class MessagePortTransport implements ITransport {
  public readonly name = 'messageport';
  private portManager: PortManager;
  private onMessage?: (message: any, windowId: string) => void;

  constructor(logger: ILogger) {
    this.portManager = new PortManager(logger);
  }

  init(onMessage: (message: any, windowId: string) => void): void {
    this.onMessage = onMessage;
  }

  registerWindow(windowId: string, window: BrowserWindow): void {
    this.portManager.register(windowId, window, (msg, _port) => {
      if (this.onMessage) {
        this.onMessage(msg, windowId);
      }
    });
  }

  unregisterWindow(windowId: string): void {
    this.portManager.unregister(windowId);
  }

  send(windowId: string, message: any): void {
    const port = this.portManager.get(windowId);
    if (port) {
      const serialized = typeof message === 'string' ? message : JSON.stringify(message);
      port.postMessage(serialized);
    }
  }

  broadcast(message: any, windowIds?: string[]): number {
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    return this.portManager.broadcast(serialized, windowIds);
  }

  dispose(): void {
    // PortManager cleanup if needed
  }
}
