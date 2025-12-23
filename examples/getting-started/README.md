# 快速开始示例

本目录包含最基础的入门示例，帮助你快速了解 electron-infra-kit 的核心功能。

## 示例列表

### basic-usage - 基础窗口管理

演示如何使用 `createElectronToolkit` 快速初始化工具包，创建和管理窗口。

**核心功能：**
- 使用 `createElectronToolkit` 初始化
- 创建主窗口
- 配置 preload 脚本
- 使用 IpcRouter 注册处理器
- 窗口间通信

**运行方式：**
```bash
cd examples/getting-started/basic-usage
electron main/index.js
```

**关键代码：**
```javascript
const { windowManager, ipcRouter } = createElectronToolkit({
  defaultConfig: {
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
    },
  },
})

// 创建窗口
windowManager.create({
  name: 'main',
  title: '主窗口',
  loadFile: path.join(__dirname, '../renderer/index.html')
})
```

## 下一步

完成基础示例后，可以继续学习：
- `examples/core-concepts/` - 核心概念深入
- `examples/multi-window/` - 多窗口管理
- `examples/advanced/` - 高级特性
