import { ILogger, Logger } from '@/infrastructure/logger';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

/**
 * PerformanceMonitor
 * 性能监控工具类
 *
 * Capabilities:
 * - Measure duration of operations (startMeasure/endMeasure)
 * - Record point-in-time metrics (recordMetric)
 * - Track operation frequency
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private logger: ILogger;

  private constructor(logger?: ILogger) {
    this.logger = logger || new Logger({ appName: 'PerformanceMonitor' });
  }

  public static getInstance(logger?: ILogger): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(logger);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring an operation
   * 开始测量操作
   * @param id Unique ID for this measurement (usually UUID or distinct name)
   * @param name Human-readable name of the operation
   * @param metadata Optional metadata
   */
  startMeasure(id: string, name: string, metadata?: any): void {
    this.metrics.set(id, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End measuring an operation and log the result
   * 结束测量操作并记录结果
   * @param id Unique ID used in startMeasure
   * @param additionalMetadata Optional metadata to merge
   * @returns Duration in milliseconds
   */
  endMeasure(id: string, additionalMetadata?: any): number | undefined {
    const metric = this.metrics.get(id);
    if (!metric) {
      // It's possible the metric was not started or already ended
      return undefined;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    this.logger.info(`[Performance] ${metric.name}: ${duration.toFixed(2)}ms`, {
      ...metric.metadata,
      ...additionalMetadata,
      duration,
    });

    this.metrics.delete(id);
    return duration;
  }

  /**
   * Record a specific metric value
   * 记录特定指标值
   */
  recordMetric(name: string, value: number, metadata?: any): void {
    this.logger.info(`[Metric] ${name}: ${value}`, metadata);
  }
}
