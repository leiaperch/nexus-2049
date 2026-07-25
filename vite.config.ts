import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Site projet GitHub Pages : https://leiaperch.github.io/nexus-2049/
// La base n'est appliquee qu'en production ; le dev reste a la racine.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/nexus-2049/" : "/",
  plugins: [react()],
  server: {
    port: (globalThis as { process?: { env?: Record<string, string> } }).process
      ?.env?.PORT
      ? Number((globalThis as any).process.env.PORT)
      : 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
}));
