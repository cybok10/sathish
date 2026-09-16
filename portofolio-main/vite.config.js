import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Keep the project deployable under GitHub Pages while allowing Vite to
  // resolve the correct base URL from the configured environment.
  base: process.env.NODE_ENV === 'production' ? '/sathish/' : '/',
  plugins: [react(), tailwindcss()],
})
