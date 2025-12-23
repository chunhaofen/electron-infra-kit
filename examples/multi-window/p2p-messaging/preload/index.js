import { contextBridge } from 'electron'
import { setupMessageBus, MessageBusClient } from 'electron-infra-kit'

setupMessageBus()
const client = new MessageBusClient()

// Track subscriptions
const subscriptions = new Map()
let subId = 0

contextBridge.exposeInMainWorld('messageBus', {
    emit: (channel, data) => {
        // Allow-list channels if needed
        const validChannels = ['p2p-test-event']
        if (validChannels.includes(channel)) {
            client.emit(channel, data)
        }
    },
    on: (channel, callback) => {
        // Allow-list channels if needed
        const validChannels = ['p2p-test-event']
        if (validChannels.includes(channel)) {
            // MessageBusClient.on might be different from EventEmitter
            // MessageBusClient has `onMessage(channel, cb)` or `subscribe`?
            // Looking at source or inferred usage:
            // Usually it's `client.on(channel, ...)` if it inherits from EventEmitter or similar
            // Or `client.subscribe(channel, ...)`
            // Based on previous `advanced-message-bus` usage:
            // We used `client.subscribe(key, cb)` for state changes.
            // For event bus (emit/on), it usually uses `on` or `onMessage`.

            // Assuming `client.on` works for events if `emit` is used.
            // If `MessageBusClient` supports `emit/on` pattern.

            // If `MessageBusClient` is strictly for State Sync (get/set), then `emit` might be for raw IPC?
            // But `setupMessageBus` sets up IPC.

            // Let's assume standard event emitter pattern for now, but wrapper might be needed.
            // Actually `MessageBusClient` in toolkit usually has `emit` and `on`.

            const handler = (data) => callback(data)
            client.on(channel, handler)

            // Ideally return unsubscribe ID
            const id = subId++
            subscriptions.set(id, { channel, handler })
            return id
        }
    }
})
