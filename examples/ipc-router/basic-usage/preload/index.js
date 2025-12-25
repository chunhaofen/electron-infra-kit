import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    calculate: async (a, b) => {
        const res = await ipcRenderer.invoke('math-add', { a, b })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    },
    controlWindow: async (action, winName) => {
        const res = await ipcRenderer.invoke('window-control', { action, winName })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    },
    getAppInfo: async () => {
        const res = await ipcRenderer.invoke('app-info')
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    }
})
