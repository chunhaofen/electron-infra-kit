import { IpcHandler } from 'electron-infra-kit'
import { z } from 'zod'

const handlers = []

// Handler 1: 获取应用路径 (使用注入的 app)
handlers.push(
  new IpcHandler(
    'getAppPath',
    'app',
    async (api, payload) => {
      const { name } = payload
      return {
        path: api.app.getPath(name),
        name,
      }
    },
    z.object({ name: z.string() })
  )
)

// Handler 2: 获取用户列表 (使用注入的 db)
handlers.push(
  new IpcHandler(
    'getUsers',
    'user',
    async (api) => {
      return api.db.getAllUsers()
    }
  )
)

// Handler 3: 获取单个用户 (使用注入的 db)
handlers.push(
  new IpcHandler(
    'getUser',
    'user',
    async (api, payload) => {
      const user = api.db.getUser(payload.id)
      if (!user) {
        throw new Error(`User ${payload.id} not found`)
      }
      return user
    },
    z.object({ id: z.string() })
  )
)

// Handler 4: 创建用户 (使用注入的 db)
handlers.push(
  new IpcHandler(
    'createUser',
    'user',
    async (api, payload) => {
      return api.db.createUser(payload)
    },
    z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['admin', 'user']),
    })
  )
)

// Handler 5: 更新用户 (使用注入的 db)
handlers.push(
  new IpcHandler(
    'updateUser',
    'user',
    async (api, payload) => {
      const { id, ...updates } = payload
      const updated = api.db.updateUser(id, updates)
      if (!updated) {
        throw new Error(`User ${id} not found`)
      }
      return updated
    },
    z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(['admin', 'user']).optional(),
    })
  )
)

// Handler 6: 删除用户 (使用注入的 db)
handlers.push(
  new IpcHandler(
    'deleteUser',
    'user',
    async (api, payload) => {
      const success = api.db.deleteUser(payload.id)
      if (!success) {
        throw new Error(`User ${payload.id} not found`)
      }
      return { success: true, id: payload.id }
    },
    z.object({ id: z.string() })
  )
)

export default handlers
