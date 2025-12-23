import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('demo', {
  async openSecondWindow() {
    const res = await ipcRenderer.invoke('renderer-to-main', {
      name: 'open-second-window',
      payload: {},
    })
    return res?.data || null
  },
})
