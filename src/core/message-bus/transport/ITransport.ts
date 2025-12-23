import { BrowserWindow } from 'electron';

export interface ITransport {
  /**
   * Transport name
   */
  readonly name: string;

  /**
   * Initialize transport
   * @param onMessage Message handler
   */
  init(onMessage: (message: any, windowId: string) => void): void;

  /**
   * Register a window with the transport
   * @param windowId Window ID
   * @param window BrowserWindow instance
   */
  registerWindow(windowId: string, window: BrowserWindow): void;

  /**
   * Unregister a window
   * @param windowId Window ID
   */
  unregisterWindow(windowId: string): void;

  /**
   * Send message to a specific window
   * @param windowId Target window ID
   * @param message Message payload
   */
  send(windowId: string, message: any): void;

  /**
   * Broadcast message to multiple windows
   * @param message Message payload
   * @param windowIds Target window IDs (optional, default to all)
   * @returns Number of successful sends
   */
  broadcast(message: any, windowIds?: string[]): number;

  /**
   * Dispose transport resources
   */
  dispose(): void;
}
