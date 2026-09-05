import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_API_PROXY || "https://lesdrapeaux.pages.dev";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { input: { main: "index.html", admin: "admin.html" } },
  },
  server: {
    // Keep browser requests same-origin locally; Vite forwards /api/* to Pages.
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
