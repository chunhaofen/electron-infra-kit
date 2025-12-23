# P2P 消息通信示例

本目录演示使用 WindowManager 工具包进行窗口到窗口的直接通信。

## 示例

### 1. 基础 P2P (`main`, `preload`, `renderer`)

本示例演示：

*   **直接通信**: 不通过主进程手动路由，直接从一个窗口发送消息到另一个窗口。
*   **广播**: 向所有窗口或特定组发送事件。

**运行方式：**

1.  进入项目根目录。
2.  运行示例：
    ```bash
    cd examples/multi-window/p2p-messaging
    electron main/index.js
    ```
