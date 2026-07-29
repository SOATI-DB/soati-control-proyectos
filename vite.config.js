import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/control-proyectos/' : '/',
  plugins: [react()],
  server: { port: 5181, host: true, strictPort: true },
})
