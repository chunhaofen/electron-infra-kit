const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser').default;
const pkg = require('./package.json');

module.exports = [
    {
        input: [
            'src/index.ts',
            'src/core/window/index.ts',
            'src/core/message-bus/index.ts',
            'src/core/ipc/index.ts',
            'src/core/ipc/transport/index.ts',
            'src/preload/index.ts'
        ],
        output: [
            {
                dir: 'dist',
                format: 'cjs',
                entryFileNames: '[name].js',
                preserveModules: true,
                preserveModulesRoot: 'src',
                sourcemap: true,
                compact: true,
            },
            {
                dir: 'dist',
                format: 'es',
                entryFileNames: '[name].mjs',
                preserveModules: true,
                preserveModulesRoot: 'src',
                sourcemap: true,
                compact: true,
            },
        ],
        treeshake: {
            moduleSideEffects: false
        },
        external: [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
            'electron',
            'path',
            'events',
            'fs',
            'crypto'
        ],
        plugins: [
            resolve({
                browser: false,
                preferBuiltins: true
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: true,
                declarationDir: 'dist',
                rootDir: 'src'
            }),
        ],
    },
    // UMD 构建
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'ElectronInfraKit',
            sourcemap: false,
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
        },
        external: [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
            'electron',
            'path',
            'events',
            'fs',
            'crypto',
        ],
        onwarn(warning, warn) {
            // 只忽略 UMD 格式中 Node.js 内置模块的特定警告
            // 这个警告对 Electron 库来说是误报，因为运行环境本身提供这些模块
            if (warning.code === 'MISSING_NODE_BUILTINS') {
                return; // 忽略此警告
            }
            // 其他所有警告都正常显示
            warn(warning);
        },
        plugins: [
            resolve({
                browser: false,  // 告诉 Rollup 这不是浏览器环境
                preferBuiltins: true  // 优先使用 Node.js 内置模块
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
            }),
            terser({
                compress: {
                    passes: 2
                },
                format: {
                    comments: false
                }
            }),
        ],
        treeshake: {
            moduleSideEffects: false
        },
    }
];
