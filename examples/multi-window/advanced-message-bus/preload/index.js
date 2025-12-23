import { contextBridge } from 'electron'
import { setupMessageBus, MessageBusClient } from 'electron-infra-kit'

// Initialize port connection
setupMessageBus()

// Create client instance
const client = new MessageBusClient()

// Track subscriptions to handle unsubscription
const subscriptions = new Map()
let subId = 0

contextBridge.exposeInMainWorld('messageBus', {
    // Basic CRUD
    getData: (key) => client.get(key),
    setData: (key, value, options) => client.set(key, value, options),
    deleteData: (key) => client.delete(key),

    // Event listening (wrapper for subscribe/watch)
    on: (eventName, callback) => {
        // In MessageBusClient, on() is usually for P2P messages or used as alias for subscribe?
        // The example uses messageBus.on('window-state-changed', ...)
        // 'window-state-changed' seems to be the default event name for ALL changes if subscribing to everything?
        // But MessageBusClient usually subscribes to specific keys.
        // If the original example uses `messageBus.on`, it might be using the EventEmitter API of the main process MessageBus directly (via remote/nodeIntegration).
        // MessageBusClient in renderer typically requires explicit subscription to keys.
        
        // However, if we look at `MessageBusClient.ts`:
        // It has `subscribe(key, cb)` and `onMessage(channel, cb)`.
        // It does NOT seem to have a generic `on` for all state changes unless we subscribe to all keys?
        // Wait, the original code: `messageBus.on('window-state-changed', ...)`
        // This suggests the original code was using the main process instance directly via nodeIntegration.
        
        // To replicate this in renderer without nodeIntegration, we need to know what keys to subscribe to, 
        // OR the `MessageBusClient` needs a way to subscribe to "all" changes.
        // The `MessageBusClient` implementation I saw doesn't show a "subscribe all".
        
        // But `MessageBus` (main) emits `window-state-changed`.
        // Does `MessageBusClient` receive all changes?
        // `MessageBusClient.handleMessage` handles `SET` and `DELETE` messages.
        // And it notifies subscribers: `const callbacks = this.subscriptions.get(msg.key);`
        // So it ONLY notifies if you are subscribed to that key.
        
        // So the renderer code `messageBus.on('window-state-changed', ...)` implies it receives EVERYTHING.
        // This might be because `createElectronToolkit` returns the MAIN process instance (via remote/proxy)?
        // If so, switching to `MessageBusClient` requires changing the logic to subscribe to specific keys.
        
        // In the example: `if (event.key === 'readonly-key') ... if (event.key === 'public-data') ...`
        // So it cares about 'readonly-key' and 'public-data'.
        
        // I will implement `subscribe` in the exposed API and update renderer to use `subscribe` instead of `on`.
        
        // But for compatibility with the existing "on" style in renderer (if I want to keep it similar):
        // I can make `on` subscribe to the keys mentioned in the renderer?
        // No, better to refactor renderer to use `subscribe`.
    },
    
    // Subscribe wrapper
    subscribe: (key, callback) => {
        const id = subId++
        const unsub = client.subscribe(key, (value) => {
             callback({ key, value }) // Mimic the event structure if needed, or just pass value
        })
        subscriptions.set(id, unsub)
        return id
    },
    
    // Transaction support
    startTransaction: () => client.startTransaction ? client.startTransaction() : null, // Check if method exists
    commitTransaction: (id) => client.commitTransaction ? client.commitTransaction(id) : null,
})
