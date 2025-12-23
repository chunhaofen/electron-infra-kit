import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    // Sender: Send message to another window via main
    sendMessage: (text) => {
        return ipcRenderer.invoke('renderer-to-main', {
            name: 'send-to-receiver',
            payload: { text },
        })
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
