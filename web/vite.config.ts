import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './' → assets relativos para o virtual host "appassets.local" (sem servidor HTTP)
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
  },
});
