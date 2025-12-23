# 生命周期管理器

生命周期管理器编排 Electron Toolkit 模块的启动和关闭，确保正确的初始化顺序和优雅的关闭过程。

## 目录

- [特性](#特性)
- [安装](#安装)
- [使用方法](#使用方法)
- [API 参考](#api-参考)
- [最佳实践](#最佳实践)

## 特性

- **模块编排**: 协调核心模块的启动顺序
- **自动启动选项**: 在实例化时自动初始化模块
- **优雅关闭**: 确保所有资源的正确清理
- **现有实例支持**: 可与预先创建的模块实例一起使用
- **调试模式集成**: 在开发环境中自动启用调试模式

## 安装

```bash
# 安装依赖
npm install
```

## 使用方法

### 基本用法

```typescript
import { LifecycleManager } from 'electron-infra-kit';
import path from 'path';

// 创建生命周期管理器实例
const lifecycleManager = new LifecycleManager({
  // WindowManager 配置
  defaultConfig: {
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  },
  autoStart: true, // 自动启动所有服务
});

// 访问初始化的模块
// 注意：它们在 startup() 完成后可用
const { windowManager, ipcRouter, messageBus } = lifecycleManager;
```

### 手动启动

```typescript
import { LifecycleManager } from 'electron-infra-kit';

// 创建不自动启动的生命周期管理器
const lifecycleManager = new LifecycleManager({
  defaultConfig: {
    // 窗口默认配置
  },
});

// 手动启动服务
async function initializeApp() {
  try {
    await lifecycleManager.startup();
    console.log('所有服务启动成功');
  } catch (error) {
    console.error('启动服务失败:', error);
  }
}

// 优雅地关闭服务
async function shutdownApp() {
  try {
    await lifecycleManager.shutdown();
    console.log('所有服务关闭成功');
  } catch (error) {
    console.error('关闭服务失败:', error);
  }
}

// 初始化应用
initializeApp();

// 当应用退出时
process.on('SIGINT', () => {
  shutdownApp();
});
```

### 使用现有实例

```typescript
import {
  LifecycleManager,
  WindowManager,
  IpcRouter,
  MessageBus,
  Logger,
} from 'electron-infra-kit';

// 手动创建实例
const logger = new Logger({ appName: 'MyApp' });
const ipcRouter = new IpcRouter({ logger });
const messageBus = new MessageBus({ logger });
const windowManager = new WindowManager({
  defaultConfig: {
    // 窗口默认配置
  },
  ipcRouter,
  messageBus,
  logger,
});

// 使用现有实例创建生命周期管理器
const lifecycleManager = new LifecycleManager({
  ipcRouter,
  messageBus,
  windowManager,
  logger,
  autoStart: true,
});
```

### 调试模式

```typescript
import { LifecycleManager } from 'electron-infra-kit';
import { DebugHelper } from 'electron-infra-kit';

// 在开发模式下创建生命周期管理器
const lifecycleManager = new LifecycleManager({
  windowConfigs: {
    // 窗口配置
  },
  isDevelopment: true, // 启用调试模式
  autoStart: true,
});

// 调试实例会自动注册
// 通过 global.__ELECTRON_TOOLKIT_DEBUG__ 访问
```

## API 参考

### 构造函数

```typescript
new LifecycleManager(config: LifecycleConfig = {})
```

#### LifecycleConfig

```typescript
interface LifecycleConfig extends WindowManagerConfig {
  /**
   * 是否在实例化时自动启动 (默认: false)
   */
  autoStart?: boolean;

  /**
   * 现有的 IpcRouter 实例
   */
  ipcRouter?: IpcRouter;

  /**
   * 现有的 WindowManager 实例
   */
  windowManager?: WindowManager;

  /**
   * 现有的 MessageBus 实例
   */
  messageBus?: MessageBus;
}
```

### 属性

#### windowManager?: WindowManager

已初始化的 WindowManager 实例。

#### ipcRouter?: IpcRouter

已初始化的 IpcRouter 实例。

#### messageBus?: MessageBus

已初始化的 MessageBus 实例。

#### started: boolean

所有服务是否已成功启动。

### 方法

#### async startup(): Promise<void>

按正确顺序启动所有服务。

#### async shutdown(): Promise<void>

以相反顺序优雅地关闭所有服务。

## 最佳实践

### 集中式模块管理

使用 LifecycleManager 集中管理模块的初始化和清理：

```typescript
// src/app.ts
import { LifecycleManager } from 'electron-infra-kit';
import path from 'path';

// 创建生命周期管理器
const lifecycleManager = new LifecycleManager({
  windowConfigs: {
    main: {
      name: 'main',
      url: 'index.html',
      options: {
        width: 800,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
        },
      },
    },
  },
  autoStart: true,
});

export default lifecycleManager;

// 在其他文件中使用
import lifecycleManager from './app';

function createNewWindow() {
  if (lifecycleManager.started && lifecycleManager.windowManager) {
    lifecycleManager.windowManager.createWindow('secondary', {
      url: 'secondary.html',
      options: {
        width: 600,
        height: 400,
      },
    });
  }
}
```

### 优雅关闭

确保应用退出时的正确清理：

```typescript
import { app } from 'electron';
import lifecycleManager from './app';

// 处理优雅关闭
app.on('before-quit', async (event) => {
  event.preventDefault();
  try {
    await lifecycleManager.shutdown();
    app.exit(0);
  } catch (error) {
    console.error('关闭失败:', error);
    app.exit(1);
  }
});
```

### 调试模式

在开发环境中使用调试模式：

```typescript
import { LifecycleManager } from 'electron-infra-kit';

const isDev = process.env.NODE_ENV === 'development';

const lifecycleManager = new LifecycleManager({
  isDevelopment: isDev,
  autoStart: true,
});

if (isDev) {
  console.log('调试模式已启用。在控制台中访问 global.__ELECTRON_TOOLKIT_DEBUG__。');
}
```

### 与 createElectronToolkit 集成

```typescript
import { createElectronToolkit } from 'electron-infra-kit';

// 创建带有生命周期管理的工具包
const kit = createElectronToolkit({
  windowConfigs: {
    // 窗口配置
  },
  debug: true,
  autoStart: true,
});

// 访问生命周期管理器
const lifecycleManager = kit.lifecycleManager;
```

## 模块初始化顺序

生命周期管理器按以下顺序初始化模块：

1. **IpcRouter**: 设置通信基础设施
2. **MessageBus**: 初始化跨窗口消息传递
3. **WindowManager**: 创建和管理应用窗口
4. **调试集成**: 注册实例以进行调试（如果在开发模式下）

## 关闭顺序

生命周期管理器以相反的顺序关闭模块：

1. **MessageBus**: 处理消息通道
2. **WindowManager**: 关闭所有窗口并清理资源
3. **IpcRouter**: 移除 IPC 处理程序并清理

这确保了正确的资源清理并防止内存泄漏。
