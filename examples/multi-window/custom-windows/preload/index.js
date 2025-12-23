import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    on: (channel, func) => {
        let validChannels = ['load-video']
        if (validChannels.includes(channel)) {
            // Remove listener to avoid duplicates if necessary, or just add
            // In this simple case, we just add.
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
    }
})
