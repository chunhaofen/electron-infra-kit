import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    getUser: async (id) => {
        const res = await ipcRenderer.invoke('user:get', { id })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    },
    createUser: async (name) => {
        const res = await ipcRenderer.invoke('user:create', { name, role: 'user' })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    },
    getTheme: async () => {
        const res = await ipcRenderer.invoke('settings:theme', { action: 'get' })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    },
    setTheme: async (value) => {
        const res = await ipcRenderer.invoke('settings:theme', { action: 'set', value })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    }
})
