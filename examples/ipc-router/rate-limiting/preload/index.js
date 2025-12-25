import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    invokeHeavyTask: async () => {
        const res = await ipcRenderer.invoke('heavy-task')
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    }
});
