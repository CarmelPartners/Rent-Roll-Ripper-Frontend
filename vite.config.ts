import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The Python Function App backend runs on http://localhost:7071 by default
// (`func start`, see backend/README.md). Only /api/* needs proxying now — auth is a
// bearer JWT sent via the Authorization header (see src/lib/auth.tsx), not a cookie,
// so there's no same-origin requirement the way the old ASP.NET backend had.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
      },
    },
  },
})
