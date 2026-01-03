import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({

  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["dayflow-odoo.vercel.app","7cdebd71efb7.ngrok-free.app","localhost"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
