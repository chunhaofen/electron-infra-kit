import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    createUser: (data) => ipcRenderer.invoke('user:create', data)
});
