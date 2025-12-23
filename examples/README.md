# Examples 示例

本目录包含 `electron-infra-kit` 的实用示例，帮助你快速上手。

## 📁 目录结构

```
examples/
├── getting-started/        # 快速开始
│   └── basic-usage/       # 基础使用示例
├── core-concepts/         # 核心概念
│   ├── debug-mode/        # 调试模式
│   └── dependency-injection-advanced/  # 高级依赖注入
├── multi-window/          # 多窗口应用
│   ├── ipc-communication/ # 窗口间通信
│   ├── state-sync/        # 状态同步
│   ├── advanced-message-bus/ # 高级消息总线
│   ├── p2p-messaging/     # 点对点通信
│   └── custom-windows/    # 自定义窗口
├── ipc-router/            # IPC 路由示例
│   ├── basic-usage/       # 基础路由
│   ├── dependency-injection/ # 依赖注入
│   ├── rate-limiting/     # 请求限流
│   └── validation/        # 参数验证 (Zod)
├── advanced/              # 高级特性
│   ├── error-handling/    # 错误处理
│   ├── performance/       # 性能优化
│   └── plugins/           # 插件系统
└── production-template/   # 生产级模板
```

## 🚀 快速开始

### 1. 构建项目

在项目根目录运行：

```bash
npm run build
```

### 2. 验证示例（可选）

运行验证脚本检查所有示例的完整性：

```bash
node examples/verify-examples.js
```

### 3. 运行示例

进入任意示例目录，使用 electron 运行 `main/index.js`：

```bash
cd examples/getting-started/basic-usage
electron main/index.js
```

## 📚 示例说明

### 入门示例

#### getting-started/basic-usage

- **难度**: ⭐ 初级
- **内容**: 最基础的窗口创建和 IPC 通信
- **适合**: 第一次使用工具包的开发者

### 核心概念

#### core-concepts/debug-mode

- **难度**: ⭐⭐ 中级
- **内容**: 调试模式的使用，DebugHelper 工具
- **学习**: 如何在开发环境中调试应用

#### core-concepts/dependency-injection-advanced

- **难度**: ⭐⭐ 中级
- **内容**: IPC 处理器的依赖注入模式
- **学习**: 如何组织复杂的 IPC 处理逻辑

### 多窗口应用

#### multi-window/ipc-communication

- **难度**: ⭐⭐ 中级
- **内容**: 多窗口之间的 IPC 通信
- **学习**: 如何在窗口间传递消息

#### multi-window/state-sync

- **难度**: ⭐⭐ 中级
- **内容**: 使用 MessageBus 同步多窗口状态
- **学习**: 如何实现跨窗口的状态共享

#### multi-window/advanced-message-bus

- **难度**: ⭐⭐⭐ 高级
- **内容**: MessageBus 的高级特性（事务、权限控制）
- **学习**: 如何在复杂应用中安全地管理状态

#### multi-window/p2p-messaging

- **难度**: ⭐⭐ 中级
- **内容**: 窗口间的点对点消息传递
- **学习**: 如何实现类似聊天应用的消息流

#### multi-window/custom-windows

- **难度**: ⭐⭐ 中级
- **内容**: 创建特殊用途的窗口（登录、播放器等）
- **学习**: 如何定制不同类型的窗口

### IPC 路由

#### ipc-router/basic-usage

- **难度**: ⭐ 初级
- **内容**: IPC 路由的基础使用

#### ipc-router/dependency-injection

- **难度**: ⭐⭐ 中级
- **内容**: 依赖注入和批量注入 API

#### ipc-router/rate-limiting

- **难度**: ⭐⭐ 中级
- **内容**: IPC 请求限流策略

#### ipc-router/validation

- **难度**: ⭐⭐ 中级
- **内容**: 使用 Zod 进行参数验证

### 高级特性

#### advanced/error-handling

- **难度**: ⭐⭐ 中级
- **内容**: 统一的错误处理机制
- **学习**: 如何优雅地处理各种错误

#### advanced/performance

- **难度**: ⭐⭐⭐ 高级
- **内容**: 性能监控和优化技术
- **学习**: 如何监控和优化应用性能

#### advanced/plugins

- **难度**: ⭐⭐⭐ 高级
- **内容**: 插件系统和生命周期钩子
- **学习**: 如何扩展 WindowManager 功能

### 生产级模板

#### production-template

- **难度**: ⭐⭐⭐ 高级
- **内容**: 完整的生产级应用模板
- **适合**: 作为新项目的起点

## 💡 学习路径

推荐按以下顺序学习：

```
1. getting-started/basic-usage          (5分钟)
   ↓
2. core-concepts/debug-mode             (15分钟)
   ↓
3. multi-window/ipc-communication       (30分钟)
   ↓
4. multi-window/state-sync              (30分钟)
   ↓
5. advanced/error-handling              (20分钟)
   ↓
6. advanced/performance                 (30分钟)
   ↓
7. production-template                  (参考)
```

## 🔧 技术要求

- Node.js >= 16
- Electron >= 22
- 已构建的 dist 目录

## 📝 注意事项

1. **构建要求**: 所有示例都依赖构建后的 `electron-infra-kit`，运行前请先执行 `npm run build`

2. **验证工具**: 使用 `node examples/verify-examples.js` 验证所有示例的完整性

3. **导入方式**: 示例使用 ESM 导入：

   ```javascript
   import { createElectronToolkit } from 'electron-infra-kit';
   ```

4. **Preload 脚本**: 所有示例都使用 preload 脚本来安全地暴露 IPC API

5. **项目结构**: 所有示例均遵循 `main` (主进程), `preload` (预加载), `renderer` (渲染进程) 的标准结构

## 📖 相关文档

- [主文档](../README.md)
- [API 文档](../guides/)
- [开发指南](../DEVELOPMENT.md)

## 🤝 贡献

欢迎提交新的示例或改进现有示例！

---

**最后更新**: 2024-12-23
