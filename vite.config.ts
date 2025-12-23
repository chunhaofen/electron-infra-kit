import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import { builtinModules } from 'module'
import pkg from './package.json'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
    conditions: ['node']  // 告诉 Vite 这是 Node.js 环境
  },
  build: {
    // 库模式配置
    lib: {
      // 多入口配置，与 rollup.config.js 保持一致
      // entry: {
      //   index: resolve(__dirname, 'src/index.ts'),
      //   'window-manager/index': resolve(__dirname, 'src/window-manager/index.ts'),
      //   'message-bus/index': resolve(__dirname, 'src/message-bus/index.ts'),
      //   'ipc-router/index': resolve(__dirname, 'src/ipc-router/index.ts'),
      //   'ipc-transport/index': resolve(__dirname, 'src/ipc-transport/index.ts'),
      //   'preload/index': resolve(__dirname, 'src/preload/index.ts')
      // },
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ElectronInfraKit'
    },
    rollupOptions: {
      // 外部依赖
      external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`)
      ],
      treeshake: {
        moduleSideEffects: false
      },
      output: [
        {
          format: 'cjs',
          entryFileNames: '[name].js',
          preserveModules: true,
          preserveModulesRoot: 'src',
          dir: 'dist',
          compact: true,
          globals: {
            electron: 'Electron'
          }
        },
        {
          format: 'es',
          entryFileNames: '[name].mjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          dir: 'dist',
          compact: true,
          globals: {
            electron: 'Electron'
          }
        },
        {
          format: 'umd',
          entryFileNames: '[name].umd.js',
          dir: 'dist',
          name: 'ElectronInfraKit',
          compact: true,
          globals: {
            electron: 'Electron',
            events: 'events',
            fs: 'fs',
            path: 'path',
            'electron-log': 'electronLog',
            'uuid': 'uuid',
            'zod': 'zod',
            'tiny-typed-emitter': 'tinyTypedEmitter',
            'crypto': 'crypto',
          }
        }
      ],
      onwarn(warning, warn) {
        // 只忽略 UMD 格式中 Node.js 内置模块的特定警告
        // 这个警告对 Electron 库来说是误报，因为运行环境本身提供这些模块
        if (warning.code === 'MISSING_NODE_BUILTINS') {
          return; // 忽略此警告
        }
        // 其他所有警告都正常显示
        warn(warning);
      }
    },
    sourcemap: false,
    minify: 'esbuild',
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      insertTypesEntry: true,
    })
  ]
})
