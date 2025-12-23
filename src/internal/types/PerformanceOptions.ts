/**
 * Performance Monitoring Options
 * 性能监控选项
 */
export interface StateKeeperOptions {
  /**
   * Delay before saving state to disk (in milliseconds)
   * 保存状态到磁盘前的延迟时间（毫秒）
   * @default 500
   */
  saveDelay?: number;

  /**
   * Save strategy: 'debounce' or 'throttle'
   * 保存策略：'debounce'（防抖）或 'throttle'（节流）
   * @default 'debounce'
   */
  saveStrategy?: 'debounce' | 'throttle';

  /**
   * Custom logger instance
   * 自定义日志实例
   */
  logger?: any;

  /**
   * Custom state file path
   * 自定义状态文件路径
   */
  stateFilePath?: string;
}

/**
 * MessageBus Subscription Options
 * MessageBus 订阅选项
 */
export interface MessageBusSubscriptionOptions {
  /**
   * Filter function to determine if the update should be processed
   * 过滤函数，用于确定是否应处理更新
   */
  filter?: (key: string, value: unknown) => boolean;

  /**
   * Specific keys to subscribe to (if not provided, subscribes to all)
   * 要订阅的特定键（如果未提供，则订阅所有）
   */
  keys?: string[];

  /**
   * Debounce time in milliseconds (0 = no debounce)
   * 防抖时间（毫秒）（0 = 不防抖）
   * @default 0
   */
  debounce?: number;
}

/**
 * Performance Monitoring Options
 * 性能监控选项
 */
export interface PerformanceOptions {
  /**
   * Enable performance monitoring
   * 启用性能监控
   * @default false
   */
  enabled?: boolean;

  /**
   * Sample rate (0-1, where 1 = 100%)
   * 采样率（0-1，其中 1 = 100%）
   * @default 1
   */
  sampleRate?: number;

  /**
   * Callback for performance metrics
   * 性能指标回调
   */
  onMetric?: (metric: PerformanceMetric) => void;
}

/**
 * Performance Metric
 * 性能指标
 */
export interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
