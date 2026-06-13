import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// On GitHub Pages the site is served from /<repo>/; locally it's served from /.
// Override with VITE_BASE_PATH if the repo name differs.
const base =
  process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? "/mapwright/" : "/");

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true, // expose on 0.0.0.0 so Windows can reach the WSL dev server
    port: 5173,
  },
  worker: {
    format: "es",
  },
});
