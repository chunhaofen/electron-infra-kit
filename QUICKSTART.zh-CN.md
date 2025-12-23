# 快速开始指南

在 5 分钟内使用 `electron-infra-kit` 启动并运行您的 Electron 应用程序。

## 前提条件

- Electron >= 22.0.0
- TypeScript >= 5.0.0
- Node.js >= 18.0.0

## 1. 安装

```bash
npm install electron-infra-kit
```

## 2. 主进程设置

在您的主入口点（例如 `src/main.ts`）初始化工具包。

```typescript
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

app.whenReady().then(async () => {
  // 初始化工具包
  const { windowManager } = createElectronToolkit({
    ipc: { autoInit: true }, // 自动初始化 IPC 处理程序
    defaultConfig: {
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  });

  // 等待初始化完成
  await windowManager.ready();

  // 创建主窗口
  await windowManager.create({
    name: 'main',
    loadUrl: 'http://localhost:5173', // 或者您的本地文件
  });
});
```

## 3. 预加载脚本

在您的预加载脚本（例如 `src/preload.ts`）中暴露安全的 API 桥接。

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit';

// 暴露 IPC 路由 API (window.ipcApi)
const ipcBridge = new IpcRendererBridge();
ipcBridge.exposeApi('ipcApi');

// 设置消息总线连接
setupMessageBus();
```

## 4. 渲染进程

在您的前端代码中使用工具包。

```typescript
// 调用 IPC 处理程序
const result = await window.ipcApi.invoke('some-handler', { data: 'test' });

// 跨窗口同步状态
await window.messageBus.setData('theme', 'dark');
```

## 下一步

- 查看 [Cookbook](./guides/COOKBOOK.zh-CN.md) 获取真实示例。
- 阅读 [窗口管理](./guides/core/window/README.zh-CN.md) 了解更多。
