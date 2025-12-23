import { z } from 'zod';
import { ILogger } from '@/infrastructure/logger';
import IpcRouter from '@/core/ipc/IpcRouter';
import { MessageBus } from '@/core/message-bus/MessageBus';

/**
 * Logger interface schema for runtime validation
 * Logger 接口的运行时验证 schema
 */
export const LoggerSchema = z.custom<ILogger>((val) => {
  return (
    typeof val === 'object' &&
    val !== null &&
    'info' in val &&
    'warn' in val &&
    'error' in val &&
    'debug' in val &&
    typeof (val as any).info === 'function' &&
    typeof (val as any).warn === 'function' &&
    typeof (val as any).error === 'function' &&
    typeof (val as any).debug === 'function'
  );
}, 'Logger must implement ILogger interface with info/warn/error/debug methods');

/**
 * IpcRouter interface schema for runtime validation
 * IpcRouter 接口的运行时验证 schema
 */
export const IpcRouterSchema = z.custom<IpcRouter>((val) => {
  return (
    typeof val === 'object' &&
    val !== null &&
    'handle' in val &&
    'addHandler' in val &&
    typeof (val as any).handle === 'function' &&
    typeof (val as any).addHandler === 'function'
  );
}, 'IpcRouter must implement handle/addHandler methods');

/**
 * MessageBus interface schema for runtime validation
 * MessageBus 接口的运行时验证 schema
 */
export const MessageBusSchema = z.custom<MessageBus>((val) => {
  return (
    typeof val === 'object' &&
    val !== null &&
    'registerWindow' in val &&
    'unregisterWindow' in val &&
    typeof (val as any).registerWindow === 'function' &&
    typeof (val as any).unregisterWindow === 'function'
  );
}, 'MessageBus must implement registerWindow/unregisterWindow methods');

/**
 * WindowManagerConfig schema
 * WindowManager 配置验证 schema
 */
export const WindowManagerConfigSchema = z
  .object({
    logger: LoggerSchema.optional(),
    ipcRouter: IpcRouterSchema.optional(),
    messageBus: MessageBusSchema.optional(),

    isDevelopment: z.boolean().default(false),
    preventExternalLinks: z.boolean().default(true),

    defaultConfig: z.record(z.string(), z.any()).default({}),

    plugins: z.array(z.any()).default([]),
    hooks: z.record(z.string(), z.any()).default({}),

    ipc: z
      .object({
        autoInit: z.boolean().default(true),
      })
      .default({ autoInit: true }),

    store: z.record(z.string(), z.any()).default({}),

    ipcSetup: z.function().optional(),
    ipcTransport: z.any().optional(),
  })
  .strict(); // Enforce no unknown keys for stricter validation

/**
 * Validate WindowManagerConfig
 * 验证 WindowManagerConfig
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateWindowManagerConfig(config: any): {
  success: boolean;
  error?: string;
  data?: z.infer<typeof WindowManagerConfigSchema>;
} {
  const result = WindowManagerConfigSchema.safeParse(config);
  if (!result.success) {
    // Format Zod errors into a readable string
    const errorMessage = result.error.issues
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');

    return {
      success: false,
      error: errorMessage,
    };
  }
  return {
    success: true,
    data: result.data,
  };
}
