# 配置管理器

配置管理器为 Electron 应用提供了一个强大的配置管理系统，具有持久化、类型安全和事件驱动架构的特性。

## 目录

- [特性](#特性)
- [安装](#安装)
- [使用方法](#使用方法)
- [API 参考](#api-参考)
- [事件](#事件)
- [使用 Zod 实现类型安全](#使用-zod-实现类型安全)
- [最佳实践](#最佳实践)

## 特性

- **持久化**: 自动将配置保存到磁盘
- **类型安全**: 支持 Zod schema 验证
- **事件驱动**: 为配置变更发出事件
- **点表示法**: 支持嵌套键路径（例如 'ui.theme'）
- **防抖保存**: 防止频繁的磁盘写入
- **灵活配置**: 可自定义文件名、保存行为等

## 安装

```bash
# 安装依赖
npm install zod
```

## 使用方法

### 基本用法

```typescript
import { ConfigManager } from 'electron-infra-kit';

// 创建配置管理器实例
const configManager = new ConfigManager({
  filename: 'app-config.json',
  autoSave: true,
  saveDelay: 500, // 500ms 防抖
});

// 设置配置值
configManager.set('app.title', '我的 Electron 应用');
configManager.set('ui.theme', 'dark');
configManager.set('ui.fontSize', 14);

// 获取配置值
const appTitle = configManager.get('app.title', '默认应用');
const uiTheme = configManager.get('ui.theme', 'light');
const fontSize = configManager.get('ui.fontSize', 12);

// 检查键是否存在
if (configManager.has('api.endpoint')) {
  const endpoint = configManager.get('api.endpoint');
  // 使用端点
}

// 删除配置值
configManager.delete('api.token');

// 获取所有配置
const allConfig = configManager.getAll();

// 清除所有配置
configManager.clear();

// 强制保存到磁盘
await configManager.save();
```

### 使用 Zod 实现类型安全

```typescript
import { ConfigManager } from 'electron-infra-kit';
import { z } from 'zod';

// 定义 schema
const configSchema = z.object({
  app: z.object({
    title: z.string().default('我的应用'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    fontSize: z.number().min(10).max(24).default(14),
    showSidebar: z.boolean().default(true),
  }),
  api: z.object({
    endpoint: z.string().url(),
    timeout: z.number().min(1000).max(30000).default(5000),
  }),
});

// 创建带有 schema 的配置管理器
const configManager = new ConfigManager({
  filename: 'app-config.json',
  schema: configSchema,
});

// 这将根据 schema 进行验证
configManager.set('ui.theme', 'dark'); // 有效
configManager.set('ui.fontSize', 16); // 有效

// 这将抛出验证错误
// configManager.set('ui.theme', 'purple'); // 无效的枚举值
// configManager.set('ui.fontSize', 9); // 无效的数字（太小）

// 获取所有带类型安全的配置
const config = configSchema.parse(configManager.getAll());
```

### 事件处理

```typescript
import { ConfigManager } from 'electron-infra-kit';

const configManager = new ConfigManager();

// 监听配置变更
configManager.on('change', (key, newValue, oldValue) => {
  console.log(`配置变更: ${key}`, { newValue, oldValue });
});

// 监听配置加载事件
configManager.on('loaded', (config) => {
  console.log('配置已从磁盘加载', config);
});

// 监听配置保存事件
configManager.on('saved', () => {
  console.log('配置已保存到磁盘');
});

// 监听错误
configManager.on('error', (error) => {
  console.error('配置错误:', error);
});
```

## API 参考

### 构造函数

```typescript
new ConfigManager(options?: ConfigManagerOptions)
```

#### ConfigManagerOptions

- **filename**: 配置文件名 (默认: 'config.json')
- **logger**: 自定义日志实例
- **autoSave**: 是否在变更时自动保存 (默认: true)
- **saveDelay**: 保存延迟（毫秒） (默认: 100)
- **schema**: 用于验证的 Zod schema

### 方法

#### get<T>(key: string, defaultValue?: T): T

获取配置值，可选择提供默认值。

#### set(key: string, value: any): void

设置配置值。

#### delete(key: string): void

删除配置值。

#### has(key: string): boolean

检查配置中是否存在键。

#### clear(): void

清除所有配置值。

#### save(): Promise<void>

强制将配置保存到磁盘。

#### load(): void

从磁盘加载配置。

#### getAll(): Record<string, any>

获取完整的配置对象。

## 事件

### change

当配置值变更时发出。

```typescript
configManager.on('change', (key: string, newValue: any, oldValue: any) => {
  // 处理变更
});
```

### loaded

当配置从磁盘加载时发出。

```typescript
configManager.on('loaded', (config: Record<string, any>) => {
  // 处理加载
});
```

### saved

当配置保存到磁盘时发出。

```typescript
configManager.on('saved', () => {
  // 处理保存
});
```

### error

当发生错误时发出。

```typescript
configManager.on('error', (error: Error) => {
  // 处理错误
});
```

## 使用 Zod 实现类型安全

配置管理器通过 Zod schema 支持类型安全。这允许您定义配置的结构并获得验证和类型推断。

### 示例 Schema

```typescript
import { z } from 'zod';

const configSchema = z.object({
  app: z.object({
    title: z.string().default('我的应用'),
    version: z.string(),
  }),
  window: z.object({
    width: z.number().default(800),
    height: z.number().default(600),
    maximized: z.boolean().default(false),
  }),
  user: z.object({
    name: z.string().optional(),
    theme: z.enum(['light', 'dark']).default('light'),
  }),
});

type AppConfig = z.infer<typeof configSchema>;
```

## 最佳实践

### 单例模式

为您的应用创建单个配置管理器实例：

```typescript
// src/config/index.ts
import { ConfigManager } from '@/config-manager';
import { z } from 'zod';

const configSchema = z.object({
  // 定义您的 schema
});

export const configManager = new ConfigManager({
  filename: 'app-config.json',
  schema: configSchema,
});

export type AppConfig = z.infer<typeof configSchema>;

// 在其他文件中使用
import { configManager } from './config';
```

### 命名空间

为您的配置使用一致的命名空间：

```typescript
// 好的做法
configManager.set('ui.theme', 'dark');
configManager.set('ui.fontSize', 14);
configManager.set('api.endpoint', 'https://api.example.com');
configManager.set('api.timeout', 5000);

// 避免这样做
configManager.set('theme', 'dark');
configManager.set('fontSize', 14);
configManager.set('apiEndpoint', 'https://api.example.com');
```

### 默认值

获取配置时始终提供默认值：

```typescript
// 好的做法
const theme = configManager.get('ui.theme', 'light');
const fontSize = configManager.get('ui.fontSize', 14);

// 避免这样做
const theme = configManager.get('ui.theme'); // 可能是 undefined
```

### 验证

使用 Zod schema 验证确保配置完整性：

```typescript
// 好的做法
const configSchema = z.object({
  ui: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    fontSize: z.number().min(10).max(24).default(14),
  }),
});

// 避免这样做
// 没有验证，可能接受无效值
```
