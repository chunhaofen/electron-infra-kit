# 高级特性示例

本目录包含 electron-infra-kit 的高级特性和最佳实践示例。

## 示例列表

### error-handling - 错误处理

演示如何在应用中实现完善的错误处理机制。

**核心功能：**

- 全局错误捕获
- IPC 错误处理
- 窗口加载失败处理
- 自定义错误类型
- 错误日志记录

**运行方式：**

```bash
cd examples/advanced/error-handling
electron main.js
```

**关键代码：**

```javascript
// 全局错误处理
windowManager.on('error', (error) => {
  console.error('窗口管理器错误:', error);
});

// IPC 错误处理
ipcRouter.addHandler({
  name: 'risky-operation',
  callback: async (api, data) => {
    try {
      return await performRiskyOperation(data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
});
```

### performance - 性能优化

演示如何优化应用性能，包括窗口创建、资源加载等。

**核心功能：**

- 窗口预加载
- 延迟加载
- 资源缓存
- 性能监控
- 内存管理

**运行方式：**

```bash
cd examples/advanced/performance
electron main/index.js
```

**优化技巧：**

- 使用 `show: false` 预创建窗口
- 合理使用 `webPreferences.backgroundThrottling`
- 监控窗口数量和内存使用
- 及时清理不需要的窗口

### plugins - 插件系统

演示如何使用插件系统扩展 WindowManager 功能。

**核心功能：**

- 创建自定义插件
- 生命周期钩子
- 插件间通信
- 动态加载插件
- 插件配置

**运行方式：**

```bash
cd examples/advanced/plugins
electron main/index.js
```

**插件示例：**

```javascript
const LoggerPlugin = {
  name: 'LoggerPlugin',
  onInit(wm) {
    console.log('插件初始化');
  },
  onWillCreate(config) {
    console.log('窗口即将创建:', config.name);
  },
  onDidCreate({ id, name }) {
    console.log('窗口已创建:', name);
  },
};

// 注册插件
const { windowManager } = createElectronToolkit({
  plugins: [LoggerPlugin],
});

// 或动态添加
windowManager.use(AnotherPlugin);
```

## 最佳实践

1. **错误处理**：始终为关键操作添加错误处理
2. **性能优化**：监控和优化窗口创建和资源加载
3. **插件化**：使用插件系统保持代码模块化
4. **日志记录**：使用自定义 Logger 记录关键操作
5. **测试**：为插件和处理器编写单元测试

## 相关文档

- [插件开发指南](../../guides/plugin-development.md)
- [性能优化指南](../../guides/performance.md)
- [错误处理最佳实践](../../guides/error-handling.md)
