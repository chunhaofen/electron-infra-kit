import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    invokeHeavyTask: () => ipcRenderer.invoke('heavy-task')
});
