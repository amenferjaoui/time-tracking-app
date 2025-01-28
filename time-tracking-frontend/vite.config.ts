import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // Permet l'accès externe pour Docker ou un réseau local
    port: 5173, // Définit explicitement le port
    watch: {
      usePolling: true, // Nécessaire pour les volumes montés dans Docker
    },
  },
})
