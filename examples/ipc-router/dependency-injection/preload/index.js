import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    getUser: (id) => ipcRenderer.invoke('user:get', { id }),
    createUser: (name) => ipcRenderer.invoke('user:create', { name, role: 'user' }),
    getTheme: () => ipcRenderer.invoke('settings:theme', { action: 'get' }),
    setTheme: (value) => ipcRenderer.invoke('settings:theme', { action: 'set', value })
})
