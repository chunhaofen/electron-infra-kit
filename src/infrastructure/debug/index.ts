/**
 * Debug Helper
 * 调试助手
 */
export class DebugHelper {
  private static isDebugEnabled = false;

  /**
   * Enable debug mode
   * 启用调试模式
   */
  static enableDebugMode(): void {
    if (this.isDebugEnabled) return;

    // 1. Enable verbose logging
    // 启用详细日志
    process.env.ELECTRON_TOOLKIT_DEBUG = 'true';
    this.isDebugEnabled = true;

    // 2. Expose global debug object
    // 暴露全局调试对象
    if (process.type === 'browser') {
      (global as any).__ELECTRON_TOOLKIT_DEBUG__ = {
        instances: {},

        // Debug methods
        // 调试方法
        listInstances: () => {
          return Object.keys((global as any).__ELECTRON_TOOLKIT_DEBUG__.instances);
        },

        getInstance: (name: string) => {
          return (global as any).__ELECTRON_TOOLKIT_DEBUG__.instances[name];
        },
      };

      console.log(
        '[ElectronToolkit] Debug mode enabled. Access global.__ELECTRON_TOOLKIT_DEBUG__ for details.'
      );
    }
  }

  /**
   * Register instance for debugging
   * 注册实例以供调试
   *
   * @param name Instance name (实例名称)
   * @param instance Instance object (实例对象)
   */
  static register(name: string, instance: any): void {
    if (process.type === 'browser' && (global as any).__ELECTRON_TOOLKIT_DEBUG__) {
      (global as any).__ELECTRON_TOOLKIT_DEBUG__.instances[name] = instance;
    }
  }
}

// Export enhanced debug helper
export * from './EnhancedDebugHelper';
export * from './PerformanceMonitor';
