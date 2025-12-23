import { contextBridge } from 'electron'
import { ipcRendererBridge } from 'electron-infra-kit/preload'

// 暴露 IPC API
ipcRendererBridge.exposeApi(contextBridge)
