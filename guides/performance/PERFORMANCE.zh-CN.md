# 性能优化指南

## 概述

electron-infra-kit 提供了多种性能优化功能，帮助您构建高效的 Electron 应用程序。

## 窗口状态持久化

`WindowManager` 使用内部优化策略自动处理窗口状态持久化（位置、大小、最大化状态）。

### 配置

你可以通过 `WindowManager` 选项配置持久化行为：

```typescript
import { WindowManager } from 'electron-infra-kit';

const windowManager = new WindowManager({
  // 启用持久化
  enablePersistence: true,

  // 配置内部存储选项
  store: {
    // 如果 API 暴露，你可以在这里配置保存策略
    // (目前默认使用 'debounce' 策略，延迟 500ms)
  },
});
```

### 保存策略 (内部)

工具包使用优化策略来防止过多的磁盘 I/O：

#### 防抖 (Debounce - 默认)

延迟保存直到活动停止。适用于：

- 窗口调整大小
- 窗口移动

#### 节流 (Throttle)

在每个时间段内最多保存一次。

### 性能提示

1. **仅在需要时启用持久化**：
   如果窗口不需要记住其位置（例如启动屏幕），你可以禁用该特定窗口的持久化。

2. **使用正确的窗口类型**：
   使用 `WindowManager` 的高效窗口创建，它复用了 Electron 的 `BrowserWindow` 优化。

## MessageBus 订阅过滤

### 基本订阅

```typescript
import { MessageBus } from 'electron-infra-kit';

const messageBus = new MessageBus();

// 订阅所有更改（默认）
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    console.log('状态已更改:', event);
  },
});
```

### 过滤订阅

```typescript
import type { MessageBusSubscriptionOptions } from 'electron-infra-kit';

// 仅订阅特定键
const subscriptionOptions: MessageBusSubscriptionOptions = {
  keys: ['theme', 'language'],
  filter: (key, value) => {
    // 仅当值不为 null 时处理
    return value !== null;
  },
  debounce: 100, // 将更新防抖100毫秒
};

// 注意：订阅过滤在类型中定义
// 实际实现将在 MessageBus 中
```

### 性能优化模式

#### 1. 基于键的过滤

```typescript
// ❌ 不好：处理所有更新
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    // 处理每一个状态变化
    updateUI(event);
  },
});

// ✅ 好：按键过滤
messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: (event) => {
    // 仅处理主题更改
    if (event.key === 'theme') {
      updateTheme(event.value);
    }
  },
});
```

#### 2. 防抖更新

```typescript
// 防抖辅助函数
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

// 使用防抖处理程序
const debouncedUpdate = debounce((event) => {
  updateUI(event);
}, 100);

messageBus.registerHandler({
  eventName: 'window-state-changed',
  callback: debouncedUpdate,
});
```

## 性能监控

### 使用 EnhancedDebugHelper

```typescript
import { debugHelper } from 'electron-infra-kit';

// 启用性能监控
debugHelper.enablePerformanceMonitoring();

// 创建计时器
const endTimer = debugHelper.createTimer('window-creation', {
  windowType: 'main',
});

// 执行操作
const windowId = windowManager.create({ name: 'main' });

// 结束计时器（自动记录指标）
endTimer();

// 获取性能统计数据
const stats = debugHelper.getStatistics();
console.log('窗口创建统计:', stats['window-creation']);
// 输出: { count: 5, total: 1250, min: 200, max: 350, avg: 250 }
```

### 手动性能跟踪

```typescript
import { debugHelper, type PerformanceMetric } from 'electron-infra-kit/infrastructure/debug';

// 记录自定义指标
debugHelper.recordMetric({
  name: 'data-sync',
  duration: 45.2,
  timestamp: Date.now(),
  metadata: {
    dataSize: 1024,
    windowCount: 3,
  },
});

// 获取所有指标
const metrics = debugHelper.getMetrics();

// 清除旧指标
debugHelper.clearMetrics();
```

### 生产环境中的性能监控

```typescript
import { debugHelper, PerformanceOptions } from 'electron-infra-kit';

// 仅在开发环境中启用
if (process.env.NODE_ENV === 'development') {
  debugHelper.enablePerformanceMonitoring();
}

// 或者在生产环境中使用采样
const performanceOptions: PerformanceOptions = {
  enabled: true,
  sampleRate: 0.1, // 监控10%的操作
  onMetric: (metric) => {
    // 发送到分析服务
    analytics.track('performance', metric);
  },
};
```

## 最佳实践

### 1. 选择合适的保存延迟

```typescript
// 窗口状态：中等延迟，防抖
const windowStateKeeper = new StateKeeper({
  saveDelay: 500,
  saveStrategy: 'debounce',
});

// 应用首选项：较长延迟，防抖
const preferencesKeeper = new StateKeeper({
  saveDelay: 2000,
  saveStrategy: 'debounce',
});

// 实时协作：短间隔，节流
const collaborationKeeper = new StateKeeper({
  saveDelay: 1000,
  saveStrategy: 'throttle',
});
```

### 2. 最小化 MessageBus 广播

```typescript
// ❌ 不好：广播每个按键
input.addEventListener('input', (e) => {
  messageBus.setData('searchQuery', e.target.value);
});

// ✅ 好：在广播前防抖
const debouncedSearch = debounce((value) => {
  messageBus.setData('searchQuery', value);
}, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

### 3. 在开发环境中监控性能

```typescript
// main.ts
if (process.env.NODE_ENV === 'development') {
  debugHelper.enablePerformanceMonitoring();

  // 每30秒记录一次统计数据
  setInterval(() => {
    const stats = debugHelper.getStatistics();
    console.table(stats);
  }, 30000);
}
```

### 4. 优化大量窗口

```typescript
// 对于有多个窗口的应用程序
const messageBus = new MessageBus({
  eventName: 'state-changed',
});

// 使用字段权限限制广播
messageBus.setFieldPermission('adminData', {
  readonly: false,
  allowedWindows: ['admin-window-id'], // 仅向特定窗口广播
});
```

## 性能基准

### StateKeeper 保存性能

| 策略              | 操作/秒 | 磁盘写入 | 用例         |
| ----------------- | ------- | -------- | ------------ |
| Debounce (500ms)  | 1000    | 1        | 窗口调整大小 |
| Throttle (500ms)  | 1000    | 2        | 持续更新     |
| Throttle (1000ms) | 1000    | 1        | 实时同步     |

### MessageBus 性能

| 窗口数 | 广播时间 | 内存使用 |
| ------ | -------- | -------- |
| 5      | < 1ms    | ~100KB   |
| 20     | < 5ms    | ~400KB   |
| 50     | < 15ms   | ~1MB     |

> **注意**：基准测试是近似值，取决于硬件和数据大小。

## 故障排除

### 高 CPU 使用率

```typescript
// 检查保存延迟是否过短
const stateKeeper = new StateKeeper({
  saveDelay: 1000, // 从100ms增加
  saveStrategy: 'throttle',
});

// 检查 MessageBus 广播频率
debugHelper.enablePerformanceMonitoring();
const stats = debugHelper.getStatistics();
console.log('MessageBus 广播:', stats['message-bus-broadcast']);
```

### 内存泄漏

```typescript
// 窗口关闭时始终注销处理程序
windowManager.on('window-will-be-destroyed', (windowId) => {
  // 清理
  messageBus.unregisterWindow(windowId);
});

// 定期清除旧的性能指标
setInterval(() => {
  debugHelper.clearMetrics();
}, 3600000); // 每小时
```
