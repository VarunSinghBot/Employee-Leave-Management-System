import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    build: { chunkSizeWarningLimit: 800 },
    server: {
      port: 5173,
      // Proxy API calls to Express so auth cookies stay first-party
      proxy: { "/api": { target: env.VITE_BACKEND_URL || "http://localhost:5000", changeOrigin: true } },
    },
    preview: {
      port: 5173,
      proxy: { "/api": { target: env.VITE_BACKEND_URL || "http://localhost:5000", changeOrigin: true } },
    },
  };
});
