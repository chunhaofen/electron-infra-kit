# 类型模块文档

`types` 模块为 Electron Window Manager 工具包提供核心 TypeScript 类型定义和工具。它包含用于增强类型安全性的品牌类型和与性能相关的接口。

## 目录

- [品牌类型](#品牌类型)
  - [概述](#概述)
  - [可用的品牌类型](#可用的品牌类型)
  - [使用方法](#使用方法)
- [性能选项](#性能选项)
  - [StateKeeperOptions](#statekeeperoptions)
  - [MessageBusSubscriptionOptions](#messagebussubscriptionoptions)
  - [PerformanceOptions](#performanceoptions)
- [API 参考](#api-参考)

## 品牌类型

### 概述

品牌类型是 TypeScript 类型，它们扩展了原始类型（如字符串）并添加了一个"品牌"，以创建彼此不能混淆的不同类型。这通过防止意外混合不同类型的标识符来增强类型安全性。

该模块提供两种版本的品牌类型：

1. **运行时品牌类型** (`BrandedTypes.ts`)：包含运行时验证和创建函数
2. **仅类型品牌类型** (`branded.ts`)：纯 TypeScript 类型定义，无运行时开销

### 可用的品牌类型

| 类型          | 描述                | 运行时 | 仅类型 |
| ------------- | ------------------- | ------ | ------ |
| `WindowId`    | 窗口的唯一标识符    | ✓      | ✓      |
| `EventName`   | 事件名称            | ✓      | ✓      |
| `ChannelName` | IPC 通道名称        | ✓      | ✓      |
| `HandlerName` | IPC 处理器名称      | ✓      | ✓      |
| `FieldKey`    | MessageBus 字段的键 | ✓      | ✓      |

### 使用方法

#### 运行时品牌类型

```typescript
import { Types } from 'electron-infra-kit';

// 创建带验证的窗口 ID
const windowId = Types.createWindowId('main-window');

// 创建带验证的事件名称
const eventName = Types.createEventName('window-ready');

// 这将抛出错误：createWindowId('');
```

#### 仅类型品牌类型

```typescript
import { Types } from 'electron-infra-kit';

// 无运行时验证的类型断言
const windowId = 'main-window' as Types.WindowId;
const eventName = 'window-ready' as Types.EventName;

// 类型安全防止混合类型
function handleWindowEvent(windowId: Types.WindowId, eventName: Types.EventName) {
  // 实现
}

// 这将导致 TypeScript 错误
// handleWindowEvent(eventName, windowId);
```

## 性能选项

### StateKeeperOptions

配置 `StateKeeper` 工具的选项：

```typescript
import type { StateKeeperOptions } from '@/internal/types';

const options: StateKeeperOptions = {
  saveDelay: 1000, // 保存状态到磁盘前的延迟时间（毫秒）
  saveStrategy: 'throttle', // 使用节流代替防抖
  logger: customLogger, // 自定义日志实例
  stateFilePath: './custom-state.json', // 自定义状态文件路径
};
```

### MessageBusSubscriptionOptions

订阅 MessageBus 更新的选项：

```typescript
import type { MessageBusSubscriptionOptions } from '@/internal/types';

const options: MessageBusSubscriptionOptions = {
  filter: (key, value) => key.startsWith('user.'), // 仅处理与用户相关的更新
  keys: ['user.name', 'user.email'], // 仅订阅特定键
  debounce: 300, // 防抖更新 300ms
};
```

### PerformanceOptions

性能监控选项：

```typescript
import type { PerformanceOptions } from '@electron-window-manager/core/types';

const options: PerformanceOptions = {
  enabled: true, // 启用性能监控
  sampleRate: 0.5, // 采样 50% 的事件
  onMetric: (metric) => {
    // 性能指标回调
    console.log(`${metric.name}: ${metric.duration}ms`);
  },
};
```

## API 参考

### 品牌类型创建函数

#### `createWindowId(id: string): WindowId`

创建带验证的窗口 ID。如果输入不是非空字符串，则抛出错误。

#### `createEventName(name: string): EventName`

创建带验证的事件名称。如果输入不是非空字符串，则抛出错误。

#### `createChannelName(name: string): ChannelName`

创建带验证的通道名称。如果输入不是非空字符串，则抛出错误。

#### `createHandlerName(name: string): HandlerName`

创建带验证的处理器名称。如果输入不是非空字符串，则抛出错误。

#### `createFieldKey(key: string): FieldKey`

创建带验证的字段键。如果输入不是非空字符串，则抛出错误。

### 类型接口

#### `StateKeeperOptions`

```typescript
interface StateKeeperOptions {
  saveDelay?: number;
  saveStrategy?: 'debounce' | 'throttle';
  logger?: any;
  stateFilePath?: string;
}
```

#### `MessageBusSubscriptionOptions`

```typescript
interface MessageBusSubscriptionOptions {
  filter?: (key: string, value: unknown) => boolean;
  keys?: string[];
  debounce?: number;
}
```

#### `PerformanceOptions`

```typescript
interface PerformanceOptions {
  enabled?: boolean;
  sampleRate?: number;
  onMetric?: (metric: PerformanceMetric) => void;
}
```

#### `PerformanceMetric`

```typescript
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

## 最佳实践

1. **使用运行时品牌类型**从外部源（用户输入、配置文件）创建标识符时，确保验证。

2. **使用仅类型品牌类型**处理内部标识符时，您对其有效性有信心，以避免运行时开销。

3. **在整个应用程序中利用品牌类型**以防止类型混淆并提高代码可维护性。

4. **根据应用程序需求适当配置性能选项**：
   - 使用较短的 `saveDelay` 以获得更响应的状态持久性
   - 对频繁更新使用 `throttle` 以限制磁盘 I/O
   - 在 MessageBus 订阅中使用 `filter` 和 `keys` 减少不必要的处理

5. **在生产环境中选择性地启用性能监控**以避免性能开销。
