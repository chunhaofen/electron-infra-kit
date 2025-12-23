# 开发指南 (Development Guide)

## 📦 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/chunhaofen/electron-infra-kit.git
cd electron-infra-kit
```

### 1. 安装依赖

```bash
pnpm install
```

安装后会自动初始化 Git Hooks（通过 ghooks）。

### 2. 开发

```bash
pnpm run dev        # 开发模式（监听文件变化）
pnpm run build      # 构建
pnpm run docs       # 生成文档
```

### 3. 代码检查

```bash
pnpm run lint           # ESLint 检查并自动修复
pnpm run format         # Prettier 格式化
pnpm run format:check   # 检查格式
pnpm run type-check     # TypeScript 类型检查
```

---

## 📝 Commit 规范

使用 Angular 规范：`<type>: <subject>` 或 `<type>(<scope>): <subject>`

### 允许的 type

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档
- `style` - 代码格式
- `refactor` - 重构
- `perf` - 性能优化
- `test` - 测试
- `chore` - 构建/工具

### 示例

```bash
git commit -m "feat: 添加窗口最小化功能"
git commit -m "fix: 修复内存泄漏"
git commit -m "docs: 更新 API 文档"
git commit -m "refactor(ipc): 重构 IPC 桥接器"
```

### Git Hooks

提交时会自动：
- ✅ 检查 commit 消息格式
- ✅ 运行 ESLint 并修复
- ✅ 运行 Prettier 格式化

---

## 🚀 发布流程

### 1. 合并到 main

```bash
git checkout main
git merge develop
```

### 2. 生成版本

```bash
pnpm run release          # 自动判断版本
pnpm run release:patch    # 1.0.1 -> 1.0.2
pnpm run release:minor    # 1.0.1 -> 1.1.0
pnpm run release:major    # 1.0.1 -> 2.0.0
```

这会自动：
- 更新 package.json 版本号
- 生成/更新 CHANGELOG.md
- 创建 git commit 和 tag

### 3. 推送并自动发布

```bash
git push --follow-tags origin main
```

GitHub Actions 会自动：
- 运行 CI 检查
- 构建项目
- 发布到 npm
- 创建 GitHub Release
- 部署文档

### 4. 合并回 develop

```bash
git checkout develop
git merge main
git push origin develop
```

---

## 🔐 配置 NPM Token（首次发布）

### 1. 在 npm 网站生成 Token

1. 登录 https://www.npmjs.com/login
2. 头像 → Account → Access Tokens
3. Generate New Token → Classic Token → Automation
4. 复制 Token（`npm_xxxxx...`）

### 2. 在 GitHub 添加 Secret

1. 访问：https://github.com/chunhaofen/electron-infra-kit.git/settings/secrets/actions
2. New repository secret
3. Name: `NPM_TOKEN`
4. Secret: 粘贴 Token
5. Add secret

---

## 🌳 分支策略

```
main (生产)     → 稳定版本，每次合并 = 发布
  ↑
develop (开发)  → 日常开发，可能不稳定
```

### 日常开发

```bash
# 在 develop 分支开发
git checkout develop
git add .
git commit -m "feat: 添加新功能"
git push origin develop
```

### 发布版本

```bash
# 合并到 main 并发布
git checkout main
git merge develop
pnpm run release
git push --follow-tags origin main

# 合并回 develop
git checkout develop
git merge main
git push origin develop
```

---

## 🔧 常用命令

```bash
# 开发
pnpm run dev              # 开发模式
pnpm run build            # 构建

# 代码质量
pnpm run lint             # 检查并修复
pnpm run format           # 格式化
pnpm run type-check       # 类型检查

# 版本管理
pnpm run release          # 发布新版本
pnpm run release:dry      # 预览（不实际修改）

# 文档
pnpm run docs             # 生成文档
```

---

## 🐛 常见问题

### Q: Git Hooks 不生效？

```bash
rm -rf node_modules
pnpm install
```

### Q: Commit 被拒绝？

确保格式正确：`feat: 描述` 或 `fix: 描述`

### Q: 如何跳过 hooks？

```bash
git commit --no-verify -m "feat: xxx"
```

---

## 📚 版本号规则

遵循 [Semantic Versioning](https://semver.org/)：

- **MAJOR (1.0.0 → 2.0.0)** - 不兼容的 API 修改
- **MINOR (1.0.0 → 1.1.0)** - 向下兼容的新功能
- **PATCH (1.0.0 → 1.0.1)** - 向下兼容的 bug 修复

---

## 🤝 贡献

1. Fork 仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交代码：`git commit -m "feat: xxx"`
4. 推送分支：`git push origin feature/xxx`
5. 创建 Pull Request 到 `develop` 分支

---

## 📄 许可证

[MIT](LICENSE)
