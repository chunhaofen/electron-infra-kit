import { MessagePortMain } from 'electron';

/**
 * ManagedPort - Wrapper for MessagePortMain to track closed state
 * ManagedPort - MessagePortMain 的包装器，用于追踪关闭状态
 */
export class ManagedPort {
  private port: MessagePortMain;
  private _isClosed: boolean = false;

  constructor(port: MessagePortMain) {
    this.port = port;
  }

  get isClosed() {
    return this._isClosed;
  }

  /**
   * Safe postMessage
   * 安全发送消息
   */
  postMessage(message: any): boolean {
    if (this._isClosed) {
      return false;
    }
    try {
      this.port.postMessage(message);
      return true;
    } catch (error) {
      // If error occurs, assume port is closed/invalid
      // 如果发生错误，假设端口已关闭/无效
      this._isClosed = true;
      throw error;
    }
  }

  /**
   * Safe close
   * 安全关闭
   */
  close(): void {
    if (this._isClosed) return;
    this._isClosed = true;
    try {
      this.port.close();
    } catch (error) {
      // Ignore close errors
    }
  }

  /**
   * Get underlying port (use with caution)
   * 获取底层端口（谨慎使用）
   */
  get rawPort(): MessagePortMain {
    return this.port;
  }
}
