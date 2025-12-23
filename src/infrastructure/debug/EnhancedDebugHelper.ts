/**
 * Debug Helper - Enhanced debugging tools for development
 * 调试助手 - 增强的开发调试工具
 */

import { ILogger, Logger } from '@/infrastructure/logger';
import type WindowManager from '@/core/window/WindowManager';
import type IpcRouter from '@/core/ipc/IpcRouter';
import type { MessageBus } from '@/core/message-bus/MessageBus';
import { PerformanceMetric } from '@/internal/types/PerformanceOptions';

/**
 * Debug Panel Configuration
 * 调试面板配置
 */
export interface DebugPanelConfig {
  /** Enable debug panel */
  enabled?: boolean;
  /** Port for debug server */
  port?: number;
  /** Auto-open in browser */
  autoOpen?: boolean;
}

/**
 * Enhanced Debug Helper
 * 增强的调试助手
 */
export class EnhancedDebugHelper {
  private static instance: EnhancedDebugHelper;
  private logger: ILogger;
  private registry: Map<string, any> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private metricsEnabled: boolean = false;

  private constructor() {
    this.logger = new Logger({ appName: 'DebugHelper' });
  }

  static getInstance(): EnhancedDebugHelper {
    if (!EnhancedDebugHelper.instance) {
      EnhancedDebugHelper.instance = new EnhancedDebugHelper();
    }
    return EnhancedDebugHelper.instance;
  }

  /**
   * Register a component for debugging
   * 注册组件用于调试
   */
  register(name: string, component: any): void {
    this.registry.set(name, component);
    this.logger.info(`Registered component: ${name}`);
  }

  /**
   * Get registered component
   * 获取已注册的组件
   */
  get(name: string): any {
    return this.registry.get(name);
  }

  /**
   * Get all registered components
   * 获取所有已注册的组件
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    this.registry.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Enable performance monitoring
   * 启用性能监控
   */
  enablePerformanceMonitoring(): void {
    this.metricsEnabled = true;
    this.logger.info('Performance monitoring enabled');
  }

  /**
   * Disable performance monitoring
   * 禁用性能监控
   */
  disablePerformanceMonitoring(): void {
    this.metricsEnabled = false;
    this.logger.info('Performance monitoring disabled');
  }

  /**
   * Record a performance metric
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.metricsEnabled) return;

    this.performanceMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }

    this.logger.info(
      `Performance: ${metric.name} took ${metric.duration.toFixed(2)}ms`,
      metric.metadata
    );
  }

  /**
   * Get performance metrics
   * 获取性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   * 清除性能指标
   */
  clearMetrics(): void {
    this.performanceMetrics = [];
    this.logger.info('Performance metrics cleared');
  }

  /**
   * Get performance statistics
   * 获取性能统计
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.performanceMetrics.forEach((metric) => {
      if (!stats[metric.name]) {
        stats[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
        };
      }

      const stat = stats[metric.name];
      stat.count++;
      stat.total += metric.duration;
      stat.min = Math.min(stat.min, metric.duration);
      stat.max = Math.max(stat.max, metric.duration);
      stat.avg = stat.total / stat.count;
    });

    return stats;
  }

  /**
   * Create a performance timer
   * 创建性能计时器
   */
  createTimer(name: string, metadata?: Record<string, unknown>): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata,
      });
    };
  }

  /**
   * Get debug information about WindowManager
   * 获取 WindowManager 的调试信息
   */
  getWindowManagerInfo(): any {
    const wm = this.registry.get('windowManager') as WindowManager | undefined;
    if (!wm) return null;

    try {
      const windows = wm.getAllWindows();
      return {
        windowCount: windows.length,
        windows: windows.map((window) => ({
          isDestroyed: window.isDestroyed(),
          isVisible: window.isVisible(),
          isMinimized: window.isMinimized(),
          isMaximized: window.isMaximized(),
          title: window.getTitle(),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get WindowManager info:', error);
      return { error: 'Failed to retrieve info' };
    }
  }

  /**
   * Get debug information about IpcRouter
   * 获取 IpcRouter 的调试信息
   */
  getIpcRouterInfo(): any {
    const router = this.registry.get('ipcRouter') as IpcRouter | undefined;
    if (!router) return null;

    // IpcRouter doesn't expose handler names by default, so we return basic info
    return {
      registered: true,
      type: 'IpcRouter',
    };
  }

  /**
   * Get debug information about MessageBus
   * 获取 MessageBus 的调试信息
   */
  getMessageBusInfo(): any {
    const bus = this.registry.get('messageBus') as MessageBus | undefined;
    if (!bus) return null;

    return {
      registeredWindows: bus.getRegisteredWindows(),
      data: bus.getData(),
    };
  }

  /**
   * Get comprehensive debug snapshot
   * 获取综合调试快照
   */
  getDebugSnapshot(): any {
    return {
      timestamp: Date.now(),
      components: {
        windowManager: this.getWindowManagerInfo(),
        ipcRouter: this.getIpcRouterInfo(),
        messageBus: this.getMessageBusInfo(),
      },
      performance: {
        metrics: this.getMetrics(),
        statistics: this.getStatistics(),
      },
    };
  }

  /**
   * Log debug snapshot to console
   * 将调试快照输出到控制台
   */
  logSnapshot(): void {
    const snapshot = this.getDebugSnapshot();
    console.log('=== Debug Snapshot ===');
    console.log(JSON.stringify(snapshot, null, 2));
  }
}

// Export singleton instance
export const debugHelper = EnhancedDebugHelper.getInstance();
