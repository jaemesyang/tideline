import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), glsl()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        plain: fileURLToPath(new URL('./plain.html', import.meta.url)),
      },
    },
  },
})