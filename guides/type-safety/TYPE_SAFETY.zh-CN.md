# 类型安全指南

## 概述

electron-infra-kit 提供了品牌类型（Branded Types）来增强类型安全并防止常见错误，如传递错误的ID或混淆不同的字符串类型。

## 品牌类型

### 什么是品牌类型？

品牌类型是一种 TypeScript 模式，它从原始类型创建不同的类型，防止意外误用：

```typescript
// 没有品牌类型
function getWindow(id: string) {}
function getHandler(name: string) {}

const windowId = 'window-123';
const handlerName = 'getUser';

getWindow(handlerName); // ❌ 编译通过但错误！
getHandler(windowId); // ❌ 编译通过但错误！

// 有品牌类型
function getWindow(id: WindowId) {}
function getHandler(name: HandlerName) {}

const windowId: WindowId = createWindowId('window-123');
const handlerName: HandlerName = createHandlerName('getUser');

getWindow(handlerName); // ✅ TypeScript 错误！
getHandler(windowId); // ✅ TypeScript 错误！
```

## 可用的品牌类型

### WindowId

```typescript
import { Types } from 'electron-infra-kit';

// 创建 WindowId
const windowId: Types.WindowId = Types.createWindowId('main-window');

// 类型守卫
if (Types.isWindowId(someString)) {
  // TypeScript 知道 someString 在这里是 WindowId
  windowManager.getWindowById(someString);
}
```

### EventName

```typescript
import { Types } from 'electron-infra-kit';

// 创建 EventName
const eventName: Types.EventName = Types.createEventName('window-created');

// 在事件发射器中使用
windowManager.on(eventName, (data) => {
  console.log('事件触发:', data);
});
```

### ChannelName

```typescript
import { Types } from 'electron-infra-kit';

// 创建 ChannelName
const channel: Types.ChannelName = Types.createChannelName('renderer-to-main');

// 在 IPC 中使用
ipcTransport.handle(channel, async (event, data) => {
  return { success: true };
});
```

### HandlerName

```typescript
import { Types } from 'electron-infra-kit';

// 创建 HandlerName
const handlerName: Types.HandlerName = Types.createHandlerName('getUser');

// 在 IPC Router 中使用
const handler = new IpcHandler(handlerName, 'user', async (api, payload) => {
  return api.db.getUser(payload.id);
});
```

### FieldKey

```typescript
import { Types } from 'electron-infra-kit';

// 为 MessageBus 创建 FieldKey
const themeKey: Types.FieldKey = Types.createFieldKey('theme');

// 在 MessageBus 中使用
messageBus.setData(themeKey, 'dark');
const theme = messageBus.getData(themeKey);
```

## 类型守卫

类型守卫帮助您在运行时安全地缩小类型：

```typescript
import { Types } from 'electron-infra-kit';

// 自定义类型守卫
function isWindowId(id: string): id is Types.WindowId {
  return typeof id === 'string' && id.length > 0;
}

function isEventName(id: string): id is Types.EventName {
  return typeof id === 'string' && id.length > 0;
}

function processId(id: string) {
  if (isWindowId(id)) {
    // TypeScript 知道 id 是 WindowId
    const window = windowManager.getWindowById(id);
  } else if (isEventName(id)) {
    // TypeScript 知道 id 是 EventName
    emitter.emit(id, data);
  }
}
```

## 实用示例

### 示例 1：窗口管理

```typescript
import { Types } from 'electron-infra-kit';

type WindowId = Types.WindowId;
const { createWindowId } = Types;

class WindowService {
  private activeWindows = new Map<WindowId, BrowserWindow>();

  createWindow(name: string): WindowId {
    const id = createWindowId(`window-${Date.now()}`);
    const window = new BrowserWindow();

    this.activeWindows.set(id, window);
    return id;
  }

  getWindow(id: WindowId): BrowserWindow | undefined {
    return this.activeWindows.get(id);
  }

  closeWindow(id: WindowId): void {
    const window = this.activeWindows.get(id);
    window?.close();
    this.activeWindows.delete(id);
  }
}

// 使用
const service = new WindowService();
const mainWindowId = service.createWindow('main');

// ✅ 类型安全
service.closeWindow(mainWindowId);

// ❌ TypeScript 错误 - 不能传递普通字符串
service.closeWindow('some-string');
```

### 示例 2：事件系统

```typescript
import { Types } from 'electron-infra-kit';

const { createEventName } = Types;
type EventName = Types.EventName;

// 将事件名称定义为常量
const EVENTS = {
  WINDOW_CREATED: createEventName('window-created'),
  WINDOW_CLOSED: createEventName('window-closed'),
  DATA_UPDATED: createEventName('data-updated'),
} as const;

class EventManager {
  private handlers = new Map<EventName, Function[]>();

  on(event: EventName, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: EventName, data: any): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }
}

// 使用
const eventManager = new EventManager();

// ✅ 类型安全
eventManager.on(EVENTS.WINDOW_CREATED, (data) => {
  console.log('窗口已创建:', data);
});

eventManager.emit(EVENTS.WINDOW_CREATED, { id: 'window-1' });

// ❌ TypeScript 错误 - 不能使用普通字符串
eventManager.emit('window-created', data);
```

### 示例 3：IPC 处理器注册表

```typescript
import { Types } from 'electron-infra-kit';

const { createHandlerName } = Types;
type HandlerName = Types.HandlerName;

interface HandlerDefinition {
  name: HandlerName;
  handler: Function;
}

class HandlerRegistry {
  private handlers = new Map<HandlerName, Function>();

  register(definition: HandlerDefinition): void {
    this.handlers.set(definition.name, definition.handler);
  }

  execute(name: HandlerName, ...args: any[]): any {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`未找到处理器: ${name}`);
    }
    return handler(...args);
  }
}

// 定义处理器
const HANDLERS = {
  GET_USER: createHandlerName('getUser'),
  UPDATE_USER: createHandlerName('updateUser'),
  DELETE_USER: createHandlerName('deleteUser'),
} as const;

// 使用
const registry = new HandlerRegistry();

registry.register({
  name: HANDLERS.GET_USER,
  handler: async (id: string) => {
    return await db.getUser(id);
  },
});

// ✅ 类型安全
await registry.execute(HANDLERS.GET_USER, 'user-123');

// ❌ TypeScript 错误
await registry.execute('getUser', 'user-123');
```

### 示例 4：使用字段键的 MessageBus

```typescript
import { Types } from 'electron-infra-kit';

const { createFieldKey } = Types;
type FieldKey = Types.FieldKey;

// 将字段键定义为常量
const FIELDS = {
  THEME: createFieldKey('theme'),
  LANGUAGE: createFieldKey('language'),
  USER_PREFERENCES: createFieldKey('userPreferences'),
} as const;

class AppState {
  constructor(private messageBus: MessageBus) {}

  setTheme(theme: 'light' | 'dark'): void {
    this.messageBus.setData(FIELDS.THEME, theme);
  }

  getTheme(): 'light' | 'dark' {
    return this.messageBus.getData(FIELDS.THEME) || 'light';
  }

  setLanguage(language: string): void {
    this.messageBus.setData(FIELDS.LANGUAGE, language);
  }

  getLanguage(): string {
    return this.messageBus.getData(FIELDS.LANGUAGE) || 'en';
  }
}

// 使用
const appState = new AppState(messageBus);

// ✅ 类型安全
appState.setTheme('dark');
const theme = appState.getTheme();

// ❌ 如果在内部尝试使用普通字符串，会发生 TypeScript 错误
// messageBus.setData('theme', 'dark');
```

## 最佳实践

### 1. 为品牌类型定义常量

```typescript
// ✅ 好：定义为常量
export const WINDOW_IDS = {
  MAIN: createWindowId('main'),
  SETTINGS: createWindowId('settings'),
  ABOUT: createWindowId('about'),
} as const;

// ❌ 不好：内联创建
windowManager.getWindowById(createWindowId('main'));
```

### 2. 使用类型守卫进行运行时验证

```typescript
// ✅ 好：使用前验证
function handleMessage(id: string, message: any) {
  if (!isWindowId(id)) {
    throw new Error('无效的窗口 ID');
  }

  const window = windowManager.getWindowById(id);
  window?.webContents.send('message', message);
}

// ❌ 不好：不验证就假设类型
function handleMessage(id: WindowId, message: any) {
  // 如果 id 实际上无效怎么办？
  const window = windowManager.getWindowById(id);
}
```

### 3. 创建辅助函数

```typescript
// 辅助函数创建类型化窗口 ID
export function createTypedWindowId(prefix: string): WindowId {
  return createWindowId(`${prefix}-${Date.now()}-${Math.random()}`);
}

// 辅助函数验证并转换
export function toWindowId(value: unknown): WindowId {
  if (typeof value !== 'string') {
    throw new Error('窗口 ID 必须是字符串');
  }
  if (!isWindowId(value)) {
    return createWindowId(value);
  }
  return value;
}
```

### 4. 记录预期类型

```typescript
/**
 * 通过 ID 获取窗口
 * @param id - 窗口 ID（使用 createWindowId 创建）
 * @returns BrowserWindow 实例或 undefined
 */
function getWindow(id: WindowId): BrowserWindow | undefined {
  return windows.get(id);
}
```

## 迁移指南

### 从普通字符串迁移

```typescript
// 之前
const windowId = 'main-window';
windowManager.getWindowById(windowId);

// 之后
import { Types } from 'electron-infra-kit';
const { createWindowId } = Types;

const windowId = createWindowId('main-window');
windowManager.getWindowById(windowId);
```

### 逐步采用

您可以逐步采用品牌类型：

```typescript
// 步骤 1：开始使用工厂函数
import { Types } from 'electron-infra-kit';
const id = Types.createWindowId('main');

// 步骤 2：添加类型注解
const id2: Types.WindowId = Types.createWindowId('main');

// 步骤 3：使用类型守卫进行验证
if (isWindowId(userInput)) {
  processWindow(userInput);
}

// 步骤 4：定义常量
const MAIN_WINDOW_ID = Types.createWindowId('main');
```

## TypeScript 配置

为了获得最佳效果，请在 `tsconfig.json` 中启用严格模式：

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true
  }
}
```

## 常见陷阱

### 陷阱 1：比较不同的品牌类型

```typescript
// ❌ 错误：比较不同的品牌类型
const windowId: WindowId = createWindowId('main');
const eventName: EventName = createEventName('main');

if (windowId === eventName) {
  // TypeScript 错误！
  // 这不会编译
}

// ✅ 正确：比较相同类型
const windowId1: WindowId = createWindowId('main');
const windowId2: WindowId = createWindowId('settings');

if (windowId1 === windowId2) {
  // OK
  // 这会编译
}
```

### 陷阱 2：序列化

```typescript
// 品牌类型在运行时只是字符串
const windowId: WindowId = createWindowId('main');

// ✅ 可以正常序列化
const json = JSON.stringify({ windowId });

// ⚠️ 反序列化时需要重新创建品牌类型
const data = JSON.parse(json);
const id: WindowId = createWindowId(data.windowId);
```

### 陷阱 3：外部 API

```typescript
// 与期望字符串的外部 API 交互时
declare function externalApi(id: string): void;

const windowId: WindowId = createWindowId('main');

// ✅ 品牌类型与字符串兼容
externalApi(windowId); // OK

// 但接收时要小心
const receivedId: string = externalApi.getId();
const typedId: WindowId = createWindowId(receivedId); // 需要转换
```
