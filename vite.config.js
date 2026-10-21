import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The k-ID test key only allows http://localhost:5173, so never move to
    // another port: fail loudly if 5173 is taken.
    port: 5173,
    strictPort: true,
    // Forward API calls to the Cogteach backend (`npm run server`).
    proxy: { '/api': 'http://localhost:8787' },
  },
})
