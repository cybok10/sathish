import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { blogApiPlugin } from './server/vite-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  base: "/portofolio/",
  plugins: [react(), tailwindcss(), blogApiPlugin()],
})
