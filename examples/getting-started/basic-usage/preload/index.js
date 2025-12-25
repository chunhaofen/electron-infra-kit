import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('demo', {
  async openSecondWindow() {
    const res = await ipcRenderer.invoke('renderer-to-main', {
      name: 'open-second-window',
      payload: {},
    })
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 200) return res.data || null
      throw new Error(res.message || `IPC Error: ${res.code}`)
    }
    return res
  },
})
