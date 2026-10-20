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
      open: false,
      port: 5173,
      host: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api": {
          target: process.env.VITE_BACKEND_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
        "/socket.io": {
          target: process.env.VITE_BACKEND_PROXY_TARGET || "http://localhost:3000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
    test: {
      environment: "happy-dom",
      globals: true,
    }, 
  }
})