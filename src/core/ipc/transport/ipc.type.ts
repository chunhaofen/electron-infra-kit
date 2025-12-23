import { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { ErrorCategory } from '@/infrastructure/errors';

export type EmptyFunc = () => void;
export type IPCEventHandler = (event: IpcMainEvent, ...args: unknown[]) => void | Promise<void>;
export type IPCHandleHandler = (
  event: IpcMainInvokeEvent,
  ...args: unknown[]
) => unknown | Promise<unknown>;

/**
 * Standard IPC Response
 * 标准 IPC 响应
 */
export interface IpcResponse<T = unknown> {
  /** Response code (0 = success, non-zero = error) */
  code: number;
  /** Response message */
  message: string;
  /** Response data */
  data: T | null;
  /** Error category (only present on error) */
  category?: ErrorCategory;
  /** Error details (only present on error) */
  details?: unknown;
  /** Error stack (only in development mode) */
  stack?: string;
}

/**
 * Public Interface for IpcTransport
 * IpcTransport 的公共接口
 */
export interface IIpcTransport {
  setLogger(logger: any): void;
  on(channel: string, cb: IPCEventHandler): void;
  handle(channel: string, cb: IPCHandleHandler): void;
  removeHandler(channel: string): void;
  removeListener(channel: string): void;
  removeAllHandlers(): void;
  removeAllListeners(): void;
}
