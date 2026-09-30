/// <reference types="vitest" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      open: true,
      port: 5173,
      host: true,
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
<<<<<<< HEAD
    test: {
      environment: "happy-dom",
      globals: true,
    },
=======
>>>>>>> 6296a4521e302191b50e8b217744faf91969530f
  }
})