# Debug Module

The Debug Module provides comprehensive debugging and performance monitoring tools for Electron applications. It helps developers track application state, measure performance, and diagnose issues during development and production.

## Table of Contents

- [DebugHelper](#debughelper)
- [EnhancedDebugHelper](#enhanceddebughelper)
- [PerformanceMonitor](#performancemonitor)
- [Usage Examples](#usage-examples)

## DebugHelper

A basic debug helper that enables debug mode and registers instances for debugging.

### Features

- Enable debug mode globally
- Register instances for debugging access
- Expose debug information via global object

### Usage

```typescript
import { DebugHelper } from 'electron-infra-kit';

// Enable debug mode
DebugHelper.enableDebugMode();

// Register an instance
DebugHelper.register('windowManager', windowManagerInstance);

// Access debug information in development console
// global.__ELECTRON_TOOLKIT_DEBUG__
```

## EnhancedDebugHelper

An enhanced debug helper with advanced performance monitoring and component inspection capabilities.

### Features

- Component registration and access
- Performance monitoring and metrics collection
- Debug information retrieval for key components
- Comprehensive debug snapshots

### Usage

```typescript
import { EnhancedDebugHelper, debugHelper } from 'electron-infra-kit';

// Get singleton instance
const debug = EnhancedDebugHelper.getInstance();

// Or use the exported instance
// const debug = debugHelper;

// Register components for debugging
debug.register('windowManager', windowManager);
debug.register('ipcRouter', ipcRouter);
debug.register('messageBus', messageBus);

// Enable performance monitoring
debug.enablePerformanceMonitoring();

// Record performance metrics
debug.recordMetric({
  name: 'window-creation',
  duration: 125,
  timestamp: Date.now(),
  metadata: { windowType: 'main' },
});

// Create a performance timer
const timer = debug.createTimer('heavy-operation', { operation: 'data-processing' });
// ... perform heavy operation
const duration = timer(); // Stops timer and records metric

// Get component debug information
const windowManagerInfo = debug.getWindowManagerInfo();
const ipcRouterInfo = debug.getIpcRouterInfo();
const messageBusInfo = debug.getMessageBusInfo();

// Get comprehensive debug snapshot
const snapshot = debug.getDebugSnapshot();

// Log snapshot to console
debug.logSnapshot();
```

## PerformanceMonitor

A dedicated performance monitoring tool for measuring operation durations and tracking metrics.

### Features

- Start/end performance measurement
- Point-in-time metric recording
- Operation frequency tracking

### Usage

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

// Get singleton instance
const debug = EnhancedDebugHelper.getInstance();

// Enable performance monitoring
debug.enablePerformanceMonitoring();

// Create a performance timer
const timer = debug.createTimer('operation-123', { query: 'SELECT * FROM users' });

// ... perform database query

// End measurement and log result
timer();

// Record point-in-time metric
debug.recordMetric({
  name: 'memory-usage',
  duration: process.memoryUsage().heapUsed,
  timestamp: Date.now(),
});
```

## Usage Examples

### Basic Debug Setup

```typescript
import { createElectronToolkit } from 'electron-infra-kit';
import { DebugHelper } from 'electron-infra-kit';

// Enable debug mode first
DebugHelper.enableDebugMode();

// Create kit instance with debug mode enabled
const kit = createElectronToolkit({
  debug: true,
});

// Access global debug object in console
// global.__ELECTRON_TOOLKIT_DEBUG__
```

### Advanced Performance Monitoring

```typescript
import { PerformanceMonitor } from 'electron-infra-kit';

const monitor = new PerformanceMonitor();

// Manual measurement
const end = monitor.start('database-query');
await db.query('...');
end();

// Get metrics
console.log(monitor.getMetrics());
```

Alternatively, using `EnhancedDebugHelper`:

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
debug.enablePerformanceMonitoring();

// Example: Measuring window creation time
const createWindowTimer = debug.createTimer('window-creation', { windowType: 'settings' });

// Create window
const window = new BrowserWindow({
  /* options */
});

// Load content
await window.loadFile('settings.html');

// Stop timer
createWindowTimer();

// Get performance statistics
const stats = debug.getStatistics();
console.log('Window Creation Stats:', stats['window-creation']);
```

### Debug Snapshot

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
debug.register('windowManager', windowManager);
debug.register('messageBus', messageBus);

// Get comprehensive snapshot
const snapshot = debug.getDebugSnapshot();

// Save snapshot to file for analysis
fs.writeFileSync('debug-snapshot.json', JSON.stringify(snapshot, null, 2));
```

## Consuming Metrics

You can access the recorded metrics programmatically to integrate with external monitoring systems (e.g., Datadog, Sentry).

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();

// 1. Get a snapshot of all metrics
const snapshot = debug.getDebugSnapshot();
console.log('Performance Metrics:', snapshot.performance);

// 2. Access internal buffer (Advanced)
// The metrics are stored in the performance monitor instance
const metrics = (debug as any).performanceMonitor?.metrics || [];

// 3. Periodic export example
setInterval(() => {
  const snapshot = debug.getDebugSnapshot();
  // Filter new metrics based on timestamp (pseudo-code)
  // const newMetrics = snapshot.performance.filter(m => m.timestamp > lastUploadTime);
  // if (newMetrics.length > 0) {
  //   uploadMetrics(newMetrics);
  //   lastUploadTime = Date.now();
  // }
}, 60000);
```
