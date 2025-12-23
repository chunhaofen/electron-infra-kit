# IPC Router 示例

本目录包含 IpcRouter 的独立示例，演示如何使用 IpcRouter 的核心功能。

## 示例列表

### basic-usage - 基础用法

演示 IpcRouter 的基本使用方式，包括处理器注册和 IPC 通信。

**核心功能：**

- 创建 IpcHandler
- 注册处理器
- 简单的 IPC 请求/响应
- 错误处理

**运行方式：**

```bash
cd examples/ipc-router/basic-usage
electron main/index.js
```

### dependency-injection - 依赖注入

演示如何在模块化项目中使用依赖注入模式。

**核心功能：**

- 模块化服务设计
- 批量注册处理器
- 跨模块依赖注入
- 服务间通信

**运行方式：**

```bash
cd examples/ipc-router/dependency-injection
electron main/index.js
```

### rate-limiting - 请求限流

演示如何对 IPC 接口进行速率限制。

**核心功能：**

- 配置限流策略
- 客户端处理限流错误
- 自动重置

**运行方式：**

```bash
cd examples/ipc-router/rate-limiting
electron main/index.js
```

### validation - 参数验证

演示如何使用 Zod 进行参数验证。

**核心功能：**

- 使用 Zod 定义 Schema
- 自动参数校验
- 类型安全的错误返回

**运行方式：**

```bash
cd examples/ipc-router/validation
electron main/index.js
```

## 相关文档

- [IpcRouter API 文档](../../guides/ipc-router.md)
- [依赖注入指南](../../guides/dependency-injection.md)
- [处理器最佳实践](../../guides/handler-best-practices.md)
