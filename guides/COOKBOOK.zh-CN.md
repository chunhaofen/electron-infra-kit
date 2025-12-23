# Electron Infra Kit 使用菜谱（中文）

本文件收集了一些常见场景下的实战示例，帮助你在真实项目中快速落地
Electron Infra Kit 提供的能力。

> **注意**
>
> - 本文假设你已经按照 [快速开始](../README.zh-CN.md#快速开始) 跑通了一个最小可运行示例，
>   不再重复环境搭建和项目结构说明，而是专注于“按场景拆分”的用法模式。
> - 文中只展示用法思路和关键代码片段，完整可运行示例可参考仓库中的
>   `examples/` 目录。

1. [手动集成（非脚手架）](#1-手动集成非脚手架)
2. [预加载与渲染进程集成](#2-预加载与渲染进程集成)
3. [多窗口工作区与状态恢复](#3-多窗口工作区与状态恢复)
4. [使用 Zod 编写类型安全的 IPC Handler](#4-使用-zod-编写类型安全的-ipc-handler)
5. [全局状态同步（MessageBus）](#5-全局状态同步messagebus)
6. [编写自定义插件](#6-编写自定义插件)
7. [进阶：自定义 IPC 传输](#7-进阶自定义-ipc-传输)
8. [处理窗口崩溃](#8-处理窗口崩溃)
9. [调试与性能](#9-调试与性能)
10. [运行注意事项](#10-运行注意事项)

---

## 1. 手动集成（非脚手架）

本节适用于：你已经有一套自己的 Electron 项目结构，不想使用
`createElectronToolkit` 一键初始化，而是希望**手动集成 WindowManager、
IpcRouter、MessageBus**。

```ts
// src/main/index.ts
import { app } from 'electron';
import { WindowManager, IpcRouter, MessageBus, Logger } from 'electron-infra-kit';

// 1. 创建 Logger
const logger = new Logger('Main');

// 2. 初始化核心服务
const ipcRouter = new IpcRouter({ logger });
const messageBus = new MessageBus({ logger });

// 3. 使用显式 IPC 设置逻辑初始化 WindowManager
const windowManager = new WindowManager({
  // 注入依赖
  ipcRouter,
  messageBus,
  logger,
  // 定义窗口默认配置
  defaultConfig: {
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: 'path/to/preload.js', // 重要：指向你的预加载脚本
    },
  },
});

// 4. 将 WindowManager 与 MessageBus 连接起来 (自动注册)
messageBus.autoRegisterWindows(windowManager);

// 或者手动注册：
// windowManager.on('window-created', ({ window, id }) => {
//   messageBus.registerWindow(id, window);
// });
// windowManager.on('window-will-be-destroyed', (id) => {
//   messageBus.unregisterWindow(id);
// });

app.whenReady().then(async () => {
  // 5. IPC 设置由 ipc.autoInit: true 自动处理
  // windowManager.setupIPC();

  // 6. 确保初始化完成
  await windowManager.ready();

  // 7. 创建第一个窗口
  windowManager.create({ name: 'main' });
});
```

---

## 2. 预加载与渲染进程集成

要安全地在渲染进程中调用主进程 API，并支持后续的状态同步，你需要正确配置
**预加载脚本（Preload）** 和 **渲染进程**。

### 2.1 预加载脚本示例

```ts
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit';

// 1. 创建实例
const ipcRendererBridge = new IpcRendererBridge();

// 2. 暴露 IPC API：在渲染进程中可以通过 window.ipcApi.invoke 调用
ipcRendererBridge.exposeApi('ipcApi');

// 3. 设置 MessageBus 连接
// 自动处理来自主进程的 "message-bus-port" 消息
setupMessageBus();
```

### 2.2 渲染进程集成示例

```ts
// renderer.ts
import { MessageBusClient } from 'electron-infra-kit';

// 1. 初始化客户端
const busClient = new MessageBusClient();

// 2. 订阅全局状态变更
// 返回一个取消订阅的函数
const unsubscribe = busClient.subscribe('theme', (value) => {
  console.log('Theme changed:', value);
  document.body.className = value;
});

// 3. 调用主进程 IPC
async function getUser() {
  try {
    const user = await window.ipcApi.invoke('renderer-to-main', {
      name: 'getUser',
      payload: { id: 1 },
    });
    console.log(user);
  } catch (error) {
    console.error('IPC 调用失败:', error);
  }
}
```

---

## 3. 多窗口工作区与状态恢复

### 1.1 需求场景

- 有一个主窗口（Main），再额外有设置窗口（Settings）、工具窗口等；
- 希望：
  - **通过名称管理窗口**（避免重复创建）；
  - **自动持久化窗口位置与大小**；
  - 根据环境（开发/生产）自动打开/关闭 DevTools。

### 3.1 主进程示例

```ts
// main.ts
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';

app.whenReady().then(async () => {
  const { windowManager } = createElectronToolkit({
    defaultConfig: {
      width: 1024,
      height: 768,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
    isDevelopment: process.env.NODE_ENV === 'development',
  });

  // 确保 WindowManager 初始化完成
  await windowManager.ready();

  // 创建主窗口（带名称和内容）
  const mainId = await windowManager.create({
    name: 'main',
    loadUrl: 'https://example.com',
  });

  // 需要时再创建一个设置窗口
  function openSettingsWindow() {
    const settingsId = windowManager.create({
      name: 'settings',
      width: 600,
      height: 400,
      loadUrl: 'https://example.com/settings',
    });
  }
});
```

> 提示：当你再次调用 `create({ name: 'settings' })` 时，内部会通过
> `WindowStore` 查找已存在的同名窗口并聚焦，而不是无限创建新窗口。

---

## 4. 使用 Zod 编写类型安全的 IPC Handler

### 4.1 需求场景

- 从渲染进程获取某个用户信息：`getUser`；
- 希望：
  - 有类型安全（参数和返回值都有类型）；
  - 运行时有 Zod 校验，防止非法请求；
  - 统一走单通道 IPC，方便调试和扩展。

### 4.2 主进程注册 Handler

```ts
// main.ts
import { app } from 'electron';
import { createElectronToolkit, IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';

app.whenReady().then(() => {
  const { windowManager, ipcRouter } = createElectronToolkit({
    defaultConfig: {
      webPreferences: {
        preload: 'path/to/preload',
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  });

  // 1. 定义 Handler
  const getUserHandler = new IpcHandler(
    'getUser', // 业务名称（调用时使用）
    'user', // 分组 / 作用域（用于分类）
    async (api, payload: { id: string }) => {
      // 这里可以通过 api 访问注入的依赖（如 app、windowManager、db 等）
      return { id: payload.id, name: 'Alice' };
    },
    z.object({ id: z.string() }) // Zod 校验请求参数
  );

  // 2. 注册到 IpcRouter
  ipcRouter.addHandler(getUserHandler);

  // 3. 创建主窗口
  const mainId = windowManager.create({
    name: 'main',
    loadUrl: 'http://localhost:5173',
  });
});
```

### 4.3 预加载与渲染进程调用

```ts
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { ipcRendererBridge } from 'electron-infra-kit/preload';

// 通过 contextBridge 暴露 window.ipcApi.invoke(name, payload)
ipcRendererBridge.exposeApi('ipcApi');
```

```ts
// renderer.ts
async function fetchUser() {
  // 自动解包：内部标准返回结构 -> 这里只拿到 data
  const user = await window.ipcApi.invoke('getUser', { id: '1' });
  console.log(user.id, user.name);
}
```

> 提示：建议始终使用 **异步 IPC** (`invoke`) 而不是同步 IPC，避免阻塞渲染进程。

---

## 5. 全局状态同步（MessageBus）

### 5.1 需求场景

- 有多个窗口：主窗口、设置窗口、通知窗口等；
- 希望它们共享一些全局状态，比如：
  - 当前主题（dark / light）；
  - 当前登录用户；
  - 某些简单的 UI 过滤条件。

### 5.2 主进程中使用 MessageBus

```ts
// main.ts
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';

app.whenReady().then(() => {
  const { windowManager, messageBus } = createElectronToolkit({
    defaultConfig: {
      width: 1024,
      height: 768,
      webPreferences: {
        preload: 'path/to/preload',
        contextIsolation: true,
      },
    },
  });

  // 创建主窗口并加载内容
  const mainId = windowManager.create({
    name: 'main',
    loadUrl: 'http://localhost:5173',
  });

  // 创建一个设置窗口并注册到 MessageBus（伪代码，具体以实际 API 为准）
  const settingsId = windowManager.create({
    name: 'settings',
    loadUrl: 'http://localhost:5173/settings',
  });

  // 假设在窗口 ready 后你会通过 preload 向主进程注册 MessagePort，
  // messageBus 会将它们与 windowId 绑定，并负责按 key 分发状态变化。
});
```

> 概念上：
>
> - **IPC 路由** 适合“请求 -> 响应”的一次性调用；
> - **MessageBus** 适合“多个窗口共享 + 持续变化”的全局状态。

---

## 6. 编写自定义插件

使用插件系统扩展 `WindowManager` 的功能。

```typescript
// plugins/analytics-plugin.ts
import { WindowManagerPlugin } from 'electron-infra-kit';

export class MyAnalyticsPlugin implements WindowManagerPlugin {
  name = 'MyAnalytics';

  onWillCreate(config) {
    console.log(`[Analytics] Window creating: ${config.name}`);
    // 你可以修改配置
    return {
      ...config,
      backgroundColor: '#000',
    };
  }

  onDidCreate(windowDetails) {
    console.log(`[Analytics] Window created: ${windowDetails.id}`);
  }

  onWillDestroy(windowId) {
    console.log(`[Analytics] Window closing: ${windowId}`);
  }
}

// main.ts
const wm = new WindowManager({
  plugins: [new MyAnalyticsPlugin()],
});
```

---

## 7. 进阶：自定义 IPC 传输

如果你需要特殊的 IPC 行为（例如，日志记录、加密），可以实现自定义传输层。

```typescript
import { IIpcTransport } from 'electron-infra-kit';

class CustomIpcTransport implements IIpcTransport {
  register(channel, listener) {
    // 拦截注册
    ipcMain.handle(channel, async (event, ...args) => {
      console.log(`[IPC Audit] Call to ${channel}`);
      return listener(event, ...args);
    });
  }

  send(channel, data) {
    // 自定义发送逻辑
  }
}
```

---

## 8. 处理窗口崩溃

通过监听 `window-crash` 和 `window-unresponsive` 事件来提高应用的稳定性。

```typescript
windowManager.on('window-crash', ({ id, name, error, willReload }) => {
  console.error(`窗口 ${name} 崩溃了:`, error);
  if (!willReload) {
    dialog.showMessageBox({
      type: 'error',
      message: '窗口发生错误，无法恢复。',
      buttons: ['重启应用', '关闭'],
    });
  }
});

windowManager.on('window-unresponsive', ({ id, name }) => {
  console.warn(`窗口 ${name} 无响应`);
});
```

---

## 9. 调试与性能

工具包包含强大的工具来帮助你调试和优化应用程序。

### 调试模式 (Debug Mode)

启用调试模式以在 DevTools 控制台中检查内部状态。

```typescript
// main/index.ts
import { DebugHelper, createElectronToolkit } from 'electron-infra-kit';

// 1. 启用调试模式
DebugHelper.enableDebugMode();

const kit = createElectronToolkit({
  debug: true,
});

// 2. 在 DevTools 控制台中 (主进程)
// global.__ELECTRON_TOOLKIT_DEBUG__.listInstances()
// global.__ELECTRON_TOOLKIT_DEBUG__.getInstance('windowManager').getAllWindows()
```

### 性能监控 (Performance Monitoring)

跟踪慢速操作和内存使用情况。

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
debug.enablePerformanceMonitoring();

// 开始测量
const endTimer = debug.createTimer('heavy-task');

// ... 执行工作 ...

// 结束测量 (如果过慢会自动记录日志)
endTimer();

// 获取报告
console.table(debug.getStatistics());
```

更多详情请参阅 [调试工具指南](./infrastructure/debug/README.zh-CN.md) 和 [性能指南](./performance/PERFORMANCE.zh-CN.md)。

---

## 10. 运行注意事项

本菜谱主要聚焦于用法模式。关于运行时的特性和边界情况，请参考 [主 README](../README.zh-CN.md)。
