import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: funciona en GitHub Pages (usuario.github.io/repo/) o en cualquier carpeta
  base: './',
  plugins: [react(), tailwindcss()],
})
