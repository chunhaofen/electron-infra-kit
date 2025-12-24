export { ElectronLogger as Logger, type LoggerOptions } from './ElectronLogger';
export type { ILogger } from './logger.type';
import { ElectronLogger } from './ElectronLogger';
import type { ILogger } from './logger.type';
import type { LoggerOptions } from './ElectronLogger';

let sharedLogger: ILogger | null = null;

export function getSharedLogger(options?: LoggerOptions): ILogger {
  if (!sharedLogger) {
    sharedLogger = new ElectronLogger(options);
  }
  return sharedLogger;
}

export function setSharedLogger(logger: ILogger): void {
  sharedLogger = logger;
}
