import path from 'path'
import { ConfigEnv, UserConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Unocss from 'unocss/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'

export default ({ mode }: ConfigEnv): UserConfig => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  return {
    base: '/DeepFake_Demo/',
    server: {
      allowedHosts: ['*'],
      host: env.VITE_HOST,
      port: +env.VITE_PORT,
      strictPort: true,
      watch: {
        usePolling: true, 
      },
    },
    resolve: {
      alias: {
        '~/': `${path.resolve(__dirname, 'src')}/`,
        'vue': 'vue/dist/vue.esm-bundler.js',
      },
    },
    build: {
      sourcemap: true,
    },
    plugins: [
      vue({
        reactivityTransform: true,
      }),
      Pages(),
      AutoImport({
        resolvers: [ArcoResolver()],
        imports: [
          'vue',
          'vue/macros',
          'vue-router',
          '@vueuse/core',
        ],
        dts: true,
        dirs: [
          './src/composables',
        ],
        vueTemplate: true,
      }),
      Components({
        dts: true,
      }),
      Unocss(),
    ],
  }
}
