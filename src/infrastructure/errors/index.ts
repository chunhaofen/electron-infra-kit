// Legacy error classes (kept for backward compatibility)
export class ElectronToolkitError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ElectronToolkitError';
  }
}

export class WindowNotFoundError extends ElectronToolkitError {
  constructor(windowId: string) {
    super(`Window "${windowId}" not found or destroyed`, 'WINDOW_NOT_FOUND', { windowId });
  }
}

export class IpcHandlerError extends ElectronToolkitError {
  constructor(handlerName: string, originalError: Error) {
    super(`IPC handler "${handlerName}" failed: ${originalError.message}`, 'IPC_HANDLER_ERROR', {
      handlerName,
      originalError,
    });
  }
}

// New unified error handling system
export * from './ErrorCodes';
export * from './StandardError';
