# Performance Optimization Guide

## Overview

The `electron-infra-kit` provides several performance optimization features to help you build efficient Electron applications.

## Window State Persistence

The `WindowManager` automatically handles window state persistence (position, size, maximization status) using an internal optimization strategy.

### Configuration

You can configure the persistence behavior via `WindowManager` options:

```typescript
import { WindowManager } from 'electron-infra-kit';

const windowManager = new WindowManager({
  // Enable persistence
  enablePersistence: true,

  // Configure the internal store options
  store: {
    // You can configure the save strategy here if exposed by the API
    // (Currently uses default 'debounce' strategy with 500ms delay)
  },
});
```

### Save Strategies (Internal)

The kit uses optimized strategies to prevent excessive disk I/O:

#### Debounce (Default)

Delays saving until activity stops. Useful for:

- Window resizing
- Window moving

#### Throttle

Saves at most once per time period.

### Performance Tips

1. **Enable Persistence Only When Needed**:
   If a window doesn't need to remember its position (e.g., a splash screen), you can disable persistence for that specific window creation.

2. **Use Correct Window Types**:
   Use `WindowManager`'s efficient window creation which reuses Electron's `BrowserWindow` optimizations.

## MessageBus Subscription Filtering

### Basic Subscription

```typescript
import { MessageBus } from 'electron-infra-kit';

const messageBus = new MessageBus();

// Subscribe to all changes (default)
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    console.log('State changed:', event);
  },
});
```

### Filtered Subscription

```typescript
import type { MessageBusSubscriptionOptions } from 'electron-infra-kit';

// Subscribe to specific keys only
const subscriptionOptions: MessageBusSubscriptionOptions = {
  keys: ['theme', 'language'],
  filter: (key, value) => {
    // Only process if value is not null
    return value !== null;
  },
  debounce: 100, // Debounce updates by 100ms
};

// Note: Subscription filtering is defined in types
// Actual implementation would be in MessageBus
```

### Performance Optimization Patterns

#### 1. Key-Based Filtering

```typescript
// ❌ Bad: Process all updates
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    // Processes every single state change
    updateUI(event);
  },
});

// ✅ Good: Filter by key
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    // Only process theme changes
    if (event.key === 'theme') {
      updateTheme(event.value);
    }
  },
});
```

#### 2. Debouncing Updates

```typescript
// Helper function for debouncing
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Use debounced handler
const debouncedUpdate = debounce((event) => {
  updateUI(event);
}, 100);

messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: debouncedUpdate,
});
```

## Performance Monitoring

### Using EnhancedDebugHelper

```typescript
import { debugHelper } from 'electron-infra-kit';

// Enable performance monitoring
debugHelper.enablePerformanceMonitoring();

// Create a timer
const endTimer = debugHelper.createTimer('window-creation', {
  windowType: 'main',
});

// Perform operation
const windowId = windowManager.create({ name: 'main' });

// End timer (automatically records metric)
endTimer();

// Get performance statistics
const stats = debugHelper.getStatistics();
console.log('Window creation stats:', stats['window-creation']);
// Output: { count: 5, total: 1250, min: 200, max: 350, avg: 250 }
```

### Manual Performance Tracking

```typescript
import { debugHelper, PerformanceMetric } from 'electron-infra-kit';

// Record custom metric
debugHelper.recordMetric({
  name: 'data-sync',
  duration: 45.2,
  timestamp: Date.now(),
  metadata: {
    dataSize: 1024,
    windowCount: 3,
  },
});

// Get all metrics
const metrics = debugHelper.getMetrics();

// Clear old metrics
debugHelper.clearMetrics();
```

### Performance Monitoring in Production

```typescript
import { debugHelper, PerformanceOptions } from 'electron-infra-kit';

// Only enable in development
if (process.env.NODE_ENV === 'development') {
  debugHelper.enablePerformanceMonitoring();
}

// Or use sampling in production
const performanceOptions: PerformanceOptions = {
  enabled: true,
  sampleRate: 0.1, // Monitor 10% of operations
  onMetric: (metric) => {
    // Send to analytics service
    analytics.track('performance', metric);
  },
};
```

## Best Practices

### 1. Choose Appropriate Save Delays

```typescript
// Window state: Medium delay, debounce
const windowStateKeeper = new StateKeeper({
  saveDelay: 500,
  saveStrategy: 'debounce',
});

// App preferences: Longer delay, debounce
const preferencesKeeper = new StateKeeper({
  saveDelay: 2000,
  saveStrategy: 'debounce',
});

// Real-time collaboration: Short interval, throttle
const collaborationKeeper = new StateKeeper({
  saveDelay: 1000,
  saveStrategy: 'throttle',
});
```

### 2. Minimize MessageBus Broadcasts

```typescript
// ❌ Bad: Broadcast every keystroke
input.addEventListener('input', (e) => {
  messageBus.setData('searchQuery', e.target.value);
});

// ✅ Good: Debounce before broadcasting
const debouncedSearch = debounce((value) => {
  messageBus.setData('searchQuery', value);
}, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

### 3. Monitor Performance in Development

```typescript
// main.ts
if (process.env.NODE_ENV === 'development') {
  debugHelper.enablePerformanceMonitoring();

  // Log statistics every 30 seconds
  setInterval(() => {
    const stats = debugHelper.getStatistics();
    console.table(stats);
  }, 30000);
}
```

### 4. Optimize Large Window Counts

```typescript
// For applications with many windows
const messageBus = new MessageBus({
  eventName: 'state-changed',
});

// Use field permissions to limit broadcasts
messageBus.setFieldPermission('adminData', {
  readonly: false,
  allowedWindows: ['admin-window-id'], // Only broadcast to specific windows
});
```

## Performance Benchmarks

### StateKeeper Save Performance

| Strategy          | Operations/sec | Disk Writes | Use Case           |
| ----------------- | -------------- | ----------- | ------------------ |
| Debounce (500ms)  | 1000           | 1           | Window resize      |
| Throttle (500ms)  | 1000           | 2           | Continuous updates |
| Throttle (1000ms) | 1000           | 1           | Real-time sync     |

### MessageBus Performance

| Windows | Broadcast Time | Memory Usage |
| ------- | -------------- | ------------ |
| 5       | < 1ms          | ~100KB       |
| 20      | < 5ms          | ~400KB       |
| 50      | < 15ms         | ~1MB         |

> **Note**: Benchmarks are approximate and depend on hardware and data size.

## Troubleshooting

### High CPU Usage

```typescript
// Check if save delay is too short
const stateKeeper = new StateKeeper({
  saveDelay: 1000, // Increase from 100ms
  saveStrategy: 'throttle',
});

// Check MessageBus broadcast frequency
debugHelper.enablePerformanceMonitoring();
const stats = debugHelper.getStatistics();
console.log('MessageBus broadcasts:', stats['message-bus-broadcast']);
```

### Memory Leaks

```typescript
// Always unregister handlers when windows close
windowManager.on('window-will-be-destroyed', (windowId) => {
  messageBus.unregisterWindow(windowId);
});

// Clear old performance metrics periodically
setInterval(() => {
  debugHelper.clearMetrics();
}, 3600000); // Every hour
```
