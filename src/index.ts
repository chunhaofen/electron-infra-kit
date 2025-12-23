import WindowManager from './core/window/WindowManager';
import IpcRouter from './core/ipc/IpcRouter';
import { MessageBus } from './core/message-bus/MessageBus';
import { WindowManagerConfig } from './core/window/window-manager.type';
import { DebugHelper } from './infrastructure/debug';

/**
 * Quick Start Helper
 * 快速开始助手
 * @param config - WindowManager configuration
 * @returns Object containing initialized instances
 */
export function createElectronToolkit(config: WindowManagerConfig = {}) {
  // Create IpcRouter
  const ipcRouter = new IpcRouter({ logger: config.logger });

  // Create WindowManager with ipcRouter integrated
  const windowManager = new WindowManager({
    ...config,
    ipcRouter,
  });

  // Create MessageBus
  const messageBus = new MessageBus({ logger: config.logger });

  // Automatically integrate MessageBus with WindowManager
  // 自动集成 MessageBus 和 WindowManager
  messageBus.autoRegisterWindows(windowManager);

  // Setup Debug Mode
  // 设置调试模式
  if (config.isDevelopment || process.env.NODE_ENV === 'development') {
    DebugHelper.enableDebugMode();
    DebugHelper.register('windowManager', windowManager);
    DebugHelper.register('ipcRouter', ipcRouter);
    DebugHelper.register('messageBus', messageBus);
  }

  return {
    windowManager,
    ipcRouter,
    messageBus,
  };
}

export * from './core/window';
export * from './core/ipc';
export * from './core/message-bus';
export * from './core/lifecycle/LifecycleManager';
// IpcTransport is internal, do not export
// export { default as IpcTransport } from './ipc-transport'
export { Logger, type LoggerOptions } from './infrastructure/logger';
export * from './preload';
// Internal utils should not be exported
// export * from './internal/utils';
export * from './infrastructure/config';
export * as Types from './types';
export { DebugHelper, debugHelper, EnhancedDebugHelper } from './infrastructure/debug';
export * from './infrastructure/errors';
