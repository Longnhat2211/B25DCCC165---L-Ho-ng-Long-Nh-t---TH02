import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project from its repository subpath.
  base: '/B25DCCC165---L-Ho-ng-Long-Nh-t---TH02/',
  plugins: [react()],
})
