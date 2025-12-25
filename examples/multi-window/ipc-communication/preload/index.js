import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    // Sender: Send message to another window via main
    sendMessage: async (text) => {
        const res = await ipcRenderer.invoke('renderer-to-main', {
            name: 'send-to-receiver',
            payload: { text },
        })
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) return res.data
            throw new Error(res.message || `IPC Error: ${res.code}`)
        }
        return res
    },
    // Receiver: Listen for custom events
    onMessage: (func) => {
        // Allow-list channels for receiver
        const validChannels = ['custom-event']
        validChannels.forEach(channel => {
            // Removing old listeners might be tricky if func is anonymous, 
            // but for this simple example we just add listener.
            // Ideally we should return a cleanup function.
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        })
    }
})
