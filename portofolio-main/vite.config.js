import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { blogApiPlugin } from './server/vite-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  // The site is served from the root of its domain, which is what a
  // Vercel deployment (or a custom domain) expects.
  base: "/",
  plugins: [react(), tailwindcss(), blogApiPlugin()],
})
