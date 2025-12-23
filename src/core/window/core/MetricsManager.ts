export interface WindowManagerMetricsData {
  windowCount: number;
  totalCreated: number;
  totalDestroyed: number;
  averageCreationTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

export class MetricsManager {
  private metrics = {
    creationTimes: [] as number[],
    totalCreated: 0,
    totalDestroyed: 0,
  };

  public recordCreation(duration: number): void {
    this.metrics.creationTimes.push(duration);
    this.metrics.totalCreated++;
  }

  public recordDestruction(): void {
    this.metrics.totalDestroyed++;
  }

  public getMetrics(windowCount: number): WindowManagerMetricsData {
    const avgCreationTime =
      this.metrics.creationTimes.length > 0
        ? this.metrics.creationTimes.reduce((a, b) => a + b, 0) / this.metrics.creationTimes.length
        : 0;

    return {
      windowCount,
      totalCreated: this.metrics.totalCreated,
      totalDestroyed: this.metrics.totalDestroyed,
      averageCreationTime: Math.round(avgCreationTime),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }
}
