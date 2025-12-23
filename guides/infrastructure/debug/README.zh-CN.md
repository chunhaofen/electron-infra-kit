# 调试模块

调试模块为 Electron 应用提供全面的调试和性能监控工具。它帮助开发者在开发和生产环境中跟踪应用状态、测量性能和诊断问题。

## 目录

- [DebugHelper](#debughelper)
- [EnhancedDebugHelper](#enhanceddebughelper)
- [PerformanceMonitor](#performancemonitor)
- [使用示例](#使用示例)

## DebugHelper

一个基础的调试助手，用于启用调试模式并注册实例以便调试。

### 功能特性

- 全局启用调试模式
- 注册实例以进行调试访问
- 通过全局对象暴露调试信息

### 使用方法

```typescript
import { DebugHelper } from 'electron-infra-kit';

// 启用调试模式
DebugHelper.enableDebugMode();

// 注册实例
DebugHelper.register('windowManager', windowManagerInstance);

// 在开发控制台中访问调试信息
// global.__ELECTRON_TOOLKIT_DEBUG__
```

## EnhancedDebugHelper

一个增强的调试助手，具有高级性能监控和组件检查功能。

### 功能特性

- 组件注册和访问
- 性能监控和指标收集
- 关键组件的调试信息检索
- 综合调试快照

### 使用方法

```typescript
import { EnhancedDebugHelper, debugHelper } from 'electron-infra-kit';

// 获取单例实例
const debug = EnhancedDebugHelper.getInstance();

// 或者使用导出的实例
// const debug = debugHelper;

// 注册组件以进行调试
debug.register('windowManager', windowManager);
debug.register('ipcRouter', ipcRouter);
debug.register('messageBus', messageBus);

// 启用性能监控
debug.enablePerformanceMonitoring();

// 记录性能指标
debug.recordMetric({
  name: 'window-creation',
  duration: 125,
  timestamp: Date.now(),
  metadata: { windowType: 'main' },
});

// 创建性能计时器
const timer = debug.createTimer('heavy-operation', { operation: 'data-processing' });
// ... 执行繁重操作
const duration = timer(); // 停止计时器并记录指标

// 获取组件调试信息
const windowManagerInfo = debug.getWindowManagerInfo();
const ipcRouterInfo = debug.getIpcRouterInfo();
const messageBusInfo = debug.getMessageBusInfo();

// 获取综合调试快照
const snapshot = debug.getDebugSnapshot();

// 将快照记录到控制台
debug.logSnapshot();
```

## PerformanceMonitor

一个专用的性能监控工具，用于测量操作持续时间和跟踪指标。

### 功能特性

- 开始/结束性能测量
- 记录时间点指标
- 跟踪操作频率

### 使用方法

```typescript
import { PerformanceMonitor } from 'electron-infra-kit';

// 获取单例实例
const monitor = PerformanceMonitor.getInstance();

// 开始测量操作
monitor.startMeasure('operation-123', 'database-query', { query: 'SELECT * FROM users' });

// ... 执行数据库查询

// 结束测量并记录结果
const duration = monitor.endMeasure('operation-123', { resultCount: 42 });

// 记录时间点指标
monitor.recordMetric('memory-usage', process.memoryUsage().heapUsed, { timestamp: Date.now() });
```

## 使用示例

### 基础调试设置

```typescript
import { createElectronToolkit } from 'electron-infra-kit';
import { DebugHelper } from 'electron-infra-kit';

// 首先启用调试模式
DebugHelper.enableDebugMode();

// 创建启用了调试模式的工具包实例
const kit = createElectronToolkit({
  debug: true,
});

// 在控制台中访问全局调试对象
// global.__ELECTRON_TOOLKIT_DEBUG__
```

### 高级性能监控

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
debug.enablePerformanceMonitoring();

// 示例：测量窗口创建时间
const createWindowTimer = debug.createTimer('window-creation', { windowType: 'settings' });

// 创建窗口
const window = new BrowserWindow({
  /* 选项 */
});

// 加载内容
await window.loadFile('settings.html');

// 停止计时器
createWindowTimer();

// 获取性能统计
const stats = debug.getStatistics();
console.log('窗口创建统计:', stats['window-creation']);
```

### 调试快照

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
debug.register('windowManager', windowManager);
debug.register('messageBus', messageBus);

// 获取综合快照
const snapshot = debug.getDebugSnapshot();

// 将快照保存到文件进行分析
fs.writeFileSync('debug-snapshot.json', JSON.stringify(snapshot, null, 2));
```
