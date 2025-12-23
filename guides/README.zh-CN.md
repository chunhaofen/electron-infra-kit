# 模块指南

[English](./README.md) | [简体中文](./README.zh-CN.md)

Electron Infra Kit 所有模块的完整文档。

## 📚 可用指南

### 核心模块 (Core Modules)

- **[窗口管理器 (Window)](./core/window/README.zh-CN.md)** - 窗口生命周期管理（注册表和插件）
- **[IPC 路由 (IPC)](./core/ipc/README.zh-CN.md)** - 依赖注入 IPC 处理器系统
- **[消息总线 (MessageBus)](./core/message-bus/README.zh-CN.md)** - 基于 MessageChannel 的多窗口状态同步
- **[生命周期 (Lifecycle)](./core/lifecycle/README.zh-CN.md)** - 工具包模块的集中式生命周期编排

### 基础设施 (Infrastructure)

- **[日志 (Logger)](./infrastructure/logger/README.zh-CN.md)** - 环境感知的日志工具
- **[配置 (Config)](./infrastructure/config/README.zh-CN.md)** - 带类型安全的持久化配置管理
- **[错误处理 (Errors)](./infrastructure/errors/ERROR_HANDLING.zh-CN.md)** - 统一错误处理系统
- **[调试 (Debug)](./infrastructure/debug/README.zh-CN.md)** - 开发调试和性能监控工具

### 内部模块 (Internal)

> 注意：以下模块为内部实现，不建议直接使用。

- **[工具集 (Utils)](./internal/utils/README.zh-CN.md)** - 内部工具类
- **[内部类型 (Types)](./internal/types/README.zh-CN.md)** - 内部类型定义

### 其他

- **[IPC 传输 (Transport)](./core/ipc/transport/README.zh-CN.md)** - 底层 IPC 通信原语
- **[预加载 (Preload)](./preload/README.zh-CN.md)** - 安全的渲染进程 API 桥接
- **[类型安全指南](./type-safety/TYPE_SAFETY.zh-CN.md)** - 类型系统使用指南

### 核心工具与辅助模块

除了单个模块外，工具包还在包入口（`electron-infra-kit`）导出了若干**核心辅助能力**，用于简化集成与调试：

- **`createElectronToolkit(config?: WindowManagerConfig)`**  
  一站式初始化函数，会创建并串联：
  - `windowManager` – 高层窗口生命周期管理器（可选 IPC 集成）
  - `ipcRouter` – 主进程侧的依赖注入 IPC 处理中心
  - `messageBus` – 基于 `MessageChannel` 的多窗口状态同步桥

  其行为包括：
  - 克隆传入的 `config`，避免调用方对象被意外修改
  - 在未提供 `ipcSetup` 时自动注入 `IpcSetup.defaultSetup`
  - 自动监听 `window-will-be-destroyed`，在窗口销毁时清理 `MessageBus` 的端口，避免内存泄漏
  - 当 `config.isDevelopment = true` 或 `NODE_ENV = 'development'` 时自动开启**调试模式**

- **`DebugHelper` 调试助手**  
  面向开发环境的调试工具：
  - `DebugHelper.enableDebugMode()` 会：
    - 打开详细日志：`process.env.ELECTRON_TOOLKIT_DEBUG = 'true'`
    - 在主进程暴露 `global.__ELECTRON_TOOLKIT_DEBUG__`
  - 全局对象包含：
    - `instances` – 调试目标实例注册表
    - `listInstances()` – 列出所有已注册实例名称
    - `getInstance(name)` – 在 REPL / DevTools 中按名称获取具体实例
  - `DebugHelper.register(name, instance)` 用于将内部对象（如 `windowManager`、`ipcRouter`、`messageBus` 等）注册到调试全局。

- **`Types` 命名空间**  
  将项目中常用的 TypeScript 类型在一个命名空间下统一导出，便于显式标注类型：
  - 窗口相关：`WindowManagerConfig`、`WindowCreationOptions` 等
  - IPC 相关：`IpcRequest`、`IpcDefinition`、传输层类型等
  - 消息总线：`DataChangeEvent`、`FieldPermission` 等
  - 预加载：`PreloadConfig`、`IpcRendererBindings`
  - 日志：`ILogger`

  使用示例：

  ```ts
  import { Types } from 'electron-infra-kit';

  function createConfig(): Types.WindowManagerConfig {
    return {
      /* ... */
    };
  }
  ```

- **工具函数（utils）**  
  当前工具集中包含一个轻量级辅助函数：
  - `delay(ms: number): Promise<void>` – 基于 Promise 的简单延时工具，常用于示例代码、测试用例或分步展示窗口行为。

## 系统架构 / System Architecture

这三个核心模块协同工作，形成了一个高内聚的基础设施：

```
Renderer Process / 渲染进程                   Main Process / 主进程
                                            ┌──────────────────────────────────────────┐
                                            │         createElectronToolkit            │
                                            │        (初始化核心模块 / Init)            │
                                            └──────┬─────────────┬─────────────┬───────┘
                                                   │             │             │
┌──────────────────────┐                           ▼             ▼             ▼
│                      │                    ┌────────────┐ ┌────────────┐ ┌────────────┐
│                      │◄──IPC Invoke───────│ IpcRouter  │ │ MessageBus │ │ WindowMgr  │
│   Renderer Window    │───────────────────►│ (Handlers) │ │ (Sync)     │ │(Lifecycle) │
│                      │                    └────────────┘ └────────────┘ └────────────┘
│                      │                           ▲             ▲              │
│                      │                           │             │              │
│                      │◄──MessagePort (P2P)───────┘             │              │
│                      │                                         │              │
│                      │────────────────Lifecycle (Events)───────│──────────────┘
└──────────────────────┘
```

1.  **WindowManager**: 中央协调器。它管理窗口生命周期，并确保其他模块正确连接到窗口（例如，在创建窗口时注册 MessageBus 端口）。
2.  **IpcRouter**: 处理命令-响应通信。它提供 API 端点，供渲染进程请求主进程执行操作。
3.  **MessageBus**: 处理状态同步。它使用高效的点对点广播方式，保持所有窗口间的数据同步。

## 🚀 快速链接

- [主 README](../README.zh-CN.md)
- [开发指南](../DEVELOPMENT.md)
- [API 文档](../docs/api/)

## 📖 如何使用这些指南

每个模块指南包含：

1. **概述** - 模块的功能和使用场景
2. **特性** - 核心能力和优势
3. **架构** - 设计模式和结构
4. **使用方法** - 代码示例和最佳实践
5. **API 参考** - 完整的 API 文档

## 🌍 语言支持

所有指南提供以下语言版本：

- 英文 (README.md)
- 简体中文 (README.zh-CN.md)
