# 核心概念示例

本目录包含 electron-infra-kit 核心概念的深入示例。

## 示例列表

### debug-mode - 调试模式

演示如何启用和使用调试模式，在开发环境中快速访问核心实例。

**核心功能：**

- 启用开发模式（`isDevelopment: true`）
- 使用 DebugHelper 注册实例
- 在浏览器控制台访问 `__ELECTRON_TOOLKIT_DEBUG__`
- 自动打开 DevTools

**运行方式：**

```bash
cd examples/core-concepts/debug-mode
electron main.js
```

**关键代码：**

```javascript
const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
  isDevelopment: true, // 启用调试模式
});

// 在浏览器控制台中可以访问：
// __ELECTRON_TOOLKIT_DEBUG__.windowManager
// __ELECTRON_TOOLKIT_DEBUG__.ipcRouter
// __ELECTRON_TOOLKIT_DEBUG__.messageBus
```

### dependency-injection-advanced - 高级依赖注入

演示如何使用 IpcRouter 的依赖注入功能，将自定义服务（如数据库）注入到处理器中。

**核心功能：**

- 创建自定义服务（MockDatabase）
- 使用 `ipcRouter.addApi()` 注入依赖
- 在处理器中访问注入的依赖
- 实现 CRUD 操作

**运行方式：**

```bash
cd examples/core-concepts/dependency-injection-advanced
electron main/index.js
```

**关键代码：**

```javascript
// 创建自定义服务
const db = new MockDatabase();

// 注入依赖
ipcRouter.addApi('app', app);
ipcRouter.addApi('windowManager', windowManager);
ipcRouter.addApi('db', db);

// 在处理器中使用
const handler = {
  name: 'get-user',
  callback: (api, data) => {
    return api.db.getUser(data.id); // 访问注入的 db
  },
};
```

## 相关文档

- [IpcRouter 文档](../../guides/ipc-router.md)
- [调试指南](../../guides/debugging.md)
- [依赖注入模式](../../guides/dependency-injection.md)
