import { IpcRendererBridge } from 'electron-infra-kit/preload';

// 创建 IPC 桥接
const bridge = new IpcRendererBridge();
bridge.exposeApi('ipcApi');

console.log('✅ Preload 脚本已加载');
