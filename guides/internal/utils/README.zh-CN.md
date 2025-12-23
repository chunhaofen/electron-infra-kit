# Utils 模块文档

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **注意**：这是工具包使用的内部模块。它不会从主包入口点导出，除非您正在修改工具包本身，否则不应在您的应用程序中直接使用。

`utils` 模块提供了各种实用工具类和函数，支持 Electron Infra Kit 的核心功能。

## 目录

- [StateKeeper](#statekeeper)
- [MessageDispatcher](#messagedispatcher)
- [Branded Helpers](#branded-helpers)
- [RateLimiter](#ratelimiter)
- [Delay Utility](#delay-utility)

## StateKeeper

窗口状态管理器，用于持久化和恢复 Electron 窗口的位置、大小和状态。

### 特性

- 将窗口状态持久化到文件系统
- 自动验证窗口状态（确保窗口保持在可用显示范围内）
- 支持防抖或节流的保存策略
- 防止多个实例写入同一状态文件的冲突
- 应用程序退出时自动清理

### 高级特性

#### 原子写入 (Atomic Write)
StateKeeper 采用 **写入后重命名** 策略确保数据完整性：
1. 将状态写入临时文件 (`.tmp`)。
2. 将临时文件重命名为目标文件（原子操作）。
3. 失败时自动清理临时文件。

#### 性能优化
- **脏检查 (Dirty Check)**: 在触发保存前比较新状态与当前内存状态。
- **MD5 哈希检查**: 在写入磁盘前计算 JSON 内容的 MD5 哈希。如果哈希值与上次保存的一致，则跳过写入。

#### 文件锁
使用静态 `activeFiles` 集合防止同一进程中的多个 `StateKeeper` 实例写入同一文件，避免竞态条件。

#### 边界验证
确保窗口在当前显示器上可见：
1. 精确匹配：如果 `displayBounds` 与当前显示器匹配，使用保存的坐标。
2. 相交检查：如果无精确匹配，检查窗口矩形是否与任何显示器相交。
3. 回退机制：如果窗口在屏幕外（例如显示器已断开），重置为默认位置。

### 使用方法

```typescript
import StateKeeper from '@/internal/utils/StateKeeper';
import { BrowserWindow } from 'electron';

// 创建 StateKeeper 实例
const stateKeeper = new StateKeeper({
  saveDelay: 500, // 保存状态前的延迟时间（默认：500ms）
  saveStrategy: 'debounce', // 保存策略：'debounce'（防抖）或 'throttle'（节流）（默认：'debounce'）
});

// 使用保存的状态创建窗口
const windowName = 'main';
const defaultState = { width: 800, height: 600, isMaximized: false, isFullScreen: false };
const savedState = stateKeeper.getState(windowName, defaultState);

const mainWindow = new BrowserWindow({
  width: savedState.width,
  height: savedState.height,
  x: savedState.x,
  y: savedState.y,
});

// 恢复窗口状态
if (savedState.isMaximized) {
  mainWindow.maximize();
}

// 窗口状态变化时保存
mainWindow.on('resize', () => {
  if (!mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
    const bounds = mainWindow.getBounds();
    stateKeeper.saveState(windowName, {
      ...bounds,
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
    });
  }
});

mainWindow.on('move', () => {
  // 与 resize 相同的保存逻辑
});

mainWindow.on('maximize', () => {
  stateKeeper.saveState(windowName, {
    ...stateKeeper.getState(windowName, defaultState),
    isMaximized: true,
  });
});
```

### API

#### StateKeeperOptions

```typescript
interface StateKeeperOptions {
  saveDelay?: number; // 默认值: 500
  saveStrategy?: 'debounce' | 'throttle'; // 默认值: 'debounce'
  logger?: ILogger;
  stateFilePath?: string;
}
```

#### WindowState

```typescript
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
  displayBounds?: Electron.Rectangle;
  groups?: string[];
}
```

#### 方法

- `constructor(options?: StateKeeperOptions)` - 创建新的 StateKeeper 实例
- `getState(windowName: string, defaultState: WindowState): WindowState` - 获取窗口的保存状态
- `saveState(windowName: string, windowState: WindowState): void` - 保存窗口状态
- `flushSync(): void` - 立即将所有状态保存到磁盘
- `clearState(windowName?: string): void` - 清除单个窗口或所有窗口的状态

## MessageDispatcher

通用事件/消息分发工具，统一不同组件间的消息处理。

### 特性

- 用于注册和分发消息的简单 API
- 支持异步处理器
- 内置错误处理
- 支持处理器元数据（例如验证模式）

### 使用方法

```typescript
import { MessageDispatcher } from '@/internal/utils';

// 创建分发器实例
const dispatcher = new MessageDispatcher('MyApp');

// 注册处理器
interface Context {
  userId: string;
}

dispatcher.register('greet', (context: Context, data: { name: string }) => {
  return `Hello ${data.name}, you're logged in as ${context.userId}`;
});

// 注册异步处理器
interface User {
  id: string;
  name: string;
}

dispatcher.register('getUser', async (context: Context, userId: string): Promise<User> => {
  const user = await fetchUserFromDatabase(userId);
  return user;
});

// 分发消息
const result = dispatcher.dispatch('greet', { userId: '123' }, { name: 'Alice' });
console.log(result); // 输出: "Hello Alice, you're logged in as 123"

// 分发异步消息
dispatcher
  .dispatch('getUser', { userId: '123' }, '456')
  .then((user) => console.log(user))
  .catch((error) => console.error(error));
```

### API

#### HandlerCallback

```typescript
type HandlerCallback<Context, T = any, R = any> = (context: Context, data: T) => R | Promise<R>;
```

#### 方法

- `constructor(name: string, logger?: ILogger, errorHandler?: (error: any, name: string) => any)` - 创建新的 MessageDispatcher 实例
- `register<T = any, R = any>(name: string, handler: HandlerCallback<Context, T, R>, metadata?: any): void` - 注册处理器
- `unregister(name: string): boolean` - 注销处理器
- `getMetadata(name: string): any | undefined` - 获取处理器元数据
- `dispatch<T = any, R = any>(name: string, context: Context, data: T): R | undefined` - 分发消息
- `has(name: string): boolean` - 检查处理器是否存在
- `getHandlerNames(): string[]` - 获取所有注册的处理器名称
- `clear(): void` - 清除所有处理器

## Branded Helpers

用于创建和验证品牌类型的工具函数，以提高类型安全性。

### 特性

- 创建经过验证的品牌类型
- 确保应用程序中的类型安全
- 提供一致的验证逻辑

### 使用方法

```typescript
import {
  createWindowId,
  createEventName,
  createChannelName,
  createHandlerName,
  createFieldKey,
} from '@/internal/utils';

// 创建品牌类型
const windowId = createWindowId('main-window');
const eventName = createEventName('window-resized');
const channelName = createChannelName('main-ipc');
const handlerName = createHandlerName('get-user');
const fieldKey = createFieldKey('username');

// 以下操作将抛出错误
// createWindowId(''); // 空字符串
// createWindowId(null); // 不是字符串
```

### API

- `createWindowId(id: string): WindowId` - 创建经过验证的 WindowId
- `createEventName(name: string): EventName` - 创建经过验证的 EventName
- `createChannelName(name: string): ChannelName` - 创建经过验证的 ChannelName
- `createHandlerName(name: string): HandlerName` - 创建经过验证的 HandlerName
- `createFieldKey(key: string): FieldKey` - 创建经过验证的 FieldKey

## RateLimiter

速率限制工具，用于防止过度操作。

### 特性

- 可配置的每个键模式的速率限制
- 默认限制支持
- 自动清理过期条目
- 内存高效

### 使用方法

```typescript
import { RateLimiter } from '@/internal/utils';

// 创建 RateLimiter 实例
const rateLimiter = new RateLimiter({
  defaultLimit: { limit: 10, interval: 1000 }, // 默认：每秒 10 个请求
  cleanupInterval: 60000, // 每分钟清理一次过期条目
});

// 为处理器设置特定限制
rateLimiter.setLimit('fileDownload', { limit: 5, interval: 1000 });

// 检查操作是否被允许
function handleDownloadRequest(windowId: string, fileName: string) {
  const key = `${windowId}:fileDownload`;
  const ruleKey = 'fileDownload';

  if (!rateLimiter.check(key, ruleKey)) {
    throw new Error('速率限制已达上限。请稍后再试。');
  }

  // 处理下载请求
  return downloadFile(fileName);
}

// 不再需要时清理
rateLimiter.stopCleanup();
```

### API

#### RateLimitConfig

```typescript
interface RateLimitConfig {
  limit: number; // 最大请求数
  interval: number; // 时间窗口（毫秒）
}
```

#### 方法

- `constructor(options?: { logger?: ILogger; defaultLimit?: RateLimitConfig; cleanupInterval?: number })` - 创建新的 RateLimiter 实例
- `setLimit(keyPattern: string, config: RateLimitConfig): void` - 为键模式设置速率限制
- `check(key: string, ruleKey: string): boolean` - 检查操作是否被允许
- `clear(): void` - 清除所有速率限制状态
- `cleanup(): void` - 手动清理过期条目
- `stopCleanup(): void` - 停止自动清理计时器

## Delay Utility

简单的基于 Promise 的延迟工具。

### 使用方法

```typescript
import { delay } from '@/internal/utils';

async function sequentialOperations() {
  console.log('操作 1');
  await delay(1000); // 等待 1 秒
  console.log('操作 2');
  await delay(2000); // 等待 2 秒
  console.log('操作 3');
}

sequentialOperations();
```

### API

- `delay(time: number): Promise<void>` - 等待指定的时间（毫秒）
