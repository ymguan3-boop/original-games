import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: ".build",
    emptyOutDir: true,
    rollupOptions: { input: "dev.html" },
  },
});

