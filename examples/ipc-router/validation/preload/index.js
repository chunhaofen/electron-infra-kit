import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    createUser: async (data) => {
        const res = await ipcRenderer.invoke('user:create', data)
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    }
});
