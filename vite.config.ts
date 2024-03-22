import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' //这个path用到了上面安装的@types/node
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// https://vitejs.dev/config/
export default defineConfig(() => {

  return {
    plugins: [
      vue(),
      visualizer({ open: true }),
      {
        ...viteCompression,
        apply: 'build'
      },
      AutoImport({
        imports: ['vue', 'vue-router'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: { enabled: true }
      }),
      Components({
        // 按需引入
        dts: true,
        dirs: ["src/components"],
        resolvers:[
        ]
      }),
    ],
    //这里进行配置别名
    resolve: {
      alias: {
        '@': path.resolve('./src'), // @代替src
        '#': path.resolve('./types'), // #代替types
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhostt:8080', // 后台服务器地址
          changeOrigin: true, // 是否允许不同源
          secure: false, // 支持https
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@/assets/styles/index.scss";',
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'pinia', 'vue-router'],
          },
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]",
        },
      },
    },
  }
})
