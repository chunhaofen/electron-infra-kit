# 高级消息总线示例

本目录包含演示 MessageBus 系统强大功能的高级示例。

## 示例

### 1. 高级特性 (`main`, `preload`, `renderer`)

本示例演示：

*   **权限控制**: 如何将特定数据键标记为 `READ_ONLY` 或限制为特定窗口访问。
*   **事务处理**: 如何使用 `startTransaction`、`commitTransaction` 和 `rollbackTransaction` 执行原子更新。
*   **原子更新**: 确保复杂操作期间的数据完整性。

**运行方式：**

1.  进入项目根目录。
2.  运行示例：
    ```bash
    cd examples/multi-window/advanced-message-bus
    electron main/index.js
    ```
