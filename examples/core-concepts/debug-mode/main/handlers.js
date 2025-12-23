import { IpcHandler } from 'electron-infra-kit'
import { z } from 'zod'

const handlers = []

// 添加一些测试数据
handlers.push(
    new IpcHandler(
        'testAction',
        'test',
        async (_api, payload) => {
            return { message: `你好 ${payload.name}!`, timestamp: Date.now() }
        },
        z.object({ name: z.string() })
    )
)

export default handlers
