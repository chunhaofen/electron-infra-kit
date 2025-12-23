import { ipcRenderer } from 'electron';
import { MessageProtocolType } from './message-bus.type';
import { IPC_CHANNELS } from '@/core/window/constants';

/**
 * Setup MessageBus connection in preload script
 * 在 preload 脚本中设置 MessageBus 连接
 *
 * Call this function in your preload script to automatically
 * set up the message bus port for the renderer process.
 * 在 preload 脚本中调用此函数以自动为渲染进程设置消息总线端口。
 *
 * @example
 * ```typescript
 * // preload.ts
 * import { setupMessageBus } from 'electron-infra-kit/message-bus';
 * setupMessageBus();
 * ```
 */
export function setupMessageBus(): void {
  ipcRenderer.on(IPC_CHANNELS.MESSAGE_BUS_PORT, (event) => {
    const [port] = event.ports;

    if (!port) {
      console.error('[MessageBus] No port received in message-bus-port event');
      return;
    }

    // Notify renderer process via internal message
    // 通过内部消息通知渲染进程
    window.postMessage({ type: MessageProtocolType.CONNECT, port }, '*', [port]);
  });
}
