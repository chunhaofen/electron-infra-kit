import { ipcRenderer } from 'electron'

// 1. 初始化并暴露标准 IPC API (自动注册)
// ----------------------------------------------------
// 这将自动暴露 window.ipcApi，包含 invoke 和 sendSync 方法
import { IpcRendererBridge } from 'electron-infra-kit/preload'

const bridge = new IpcRendererBridge();
bridge.exposeApi('ipcApi');

// 暴露 MessageBus API
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('messageBus', {
  getData: (key) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'get',
      data: { key },
    })
  },

  setData: (key, value, windowId) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'set',
      data: { key, value, windowId },
    })
  },

  subscribe: (windowId, keys) => {
    return ipcRenderer.invoke('message-bus-invoke', {
      name: 'subscribe',
      data: { windowId, keys },
    })
  },

  onStateChange: (callback) => {
    ipcRenderer.once('message-bus-port', (event) => {
      const [port] = event.ports
      port.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          callback(data)
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      }
      port.start()
    })
  },
})
