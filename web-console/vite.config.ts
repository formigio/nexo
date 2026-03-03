import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'

const wardenCa = path.join(os.homedir(), '.warden/ssl/rootca/certs/ca.cert.pem')
const agent = new https.Agent({
  ca: fs.existsSync(wardenCa) ? fs.readFileSync(wardenCa) : undefined,
})

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://app.nexo.test',
        changeOrigin: true,
        secure: false,
        agent,
      },
    },
  },
})
