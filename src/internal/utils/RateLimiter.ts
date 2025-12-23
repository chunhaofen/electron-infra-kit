import { ILogger } from '@/infrastructure/logger';

export interface RateLimitConfig {
  limit: number;
  interval: number; // in milliseconds
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitConfig>();
  private state = new Map<string, RateLimitState>();
  private defaultLimit: RateLimitConfig | null = null;
  private logger?: ILogger;

  private cleanupTimer: NodeJS.Timeout | null = null;
  private cleanupInterval: number;

  constructor(
    options: {
      logger?: ILogger;
      defaultLimit?: RateLimitConfig;
      cleanupInterval?: number; // default: 60000ms (1 minute)
    } = {}
  ) {
    this.logger = options.logger;
    this.defaultLimit = options.defaultLimit || null;
    this.cleanupInterval = options.cleanupInterval || 60000;

    this.startCleanup();
  }

  private startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    // Unref to prevent preventing process exit
    this.cleanupTimer.unref();
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Set rate limit for a specific key pattern
   * @param keyPattern - The key pattern to limit (e.g., "handlerName")
   * @param config - Rate limit configuration
   */
  setLimit(keyPattern: string, config: RateLimitConfig): void {
    this.limits.set(keyPattern, config);
  }

  /**
   * Check if the action is allowed for the given key
   * @param key - Unique key for the action (e.g., "windowId:handlerName")
   * @param ruleKey - Key to lookup configuration (e.g., "handlerName")
   * @returns true if allowed, false if rate limit exceeded
   */
  check(key: string, ruleKey: string): boolean {
    const config = this.limits.get(ruleKey) || this.defaultLimit;

    // If no limit configured, allow
    if (!config) return true;

    const now = Date.now();
    let record = this.state.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.interval,
      };
      this.state.set(key, record);
    }

    if (record.count >= config.limit) {
      if (this.logger) {
        this.logger.warn(
          `Rate limit exceeded for ${key} (Rule: ${ruleKey}, Limit: ${config.limit}/${config.interval}ms)`
        );
      }
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.state.clear();
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.state.entries()) {
      if (now > record.resetTime) {
        this.state.delete(key);
      }
    }
  }
}
