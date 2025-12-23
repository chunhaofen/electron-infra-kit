import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    calculate: (a, b) => ipcRenderer.invoke('math-add', { a, b }),
    controlWindow: (action, winName) => ipcRenderer.invoke('window-control', { action, winName }),
    getAppInfo: () => ipcRenderer.invoke('app-info')
})
