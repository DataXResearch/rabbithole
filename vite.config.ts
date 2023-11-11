import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path, { resolve } from "path";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

const srcDir = resolve(__dirname, "src");

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    commonjsOptions: {
      include: ["tailwind.config.js", "node_modules/**"],
    },
    sourcemap: true,
  },
  optimizeDeps: {
    include: ["tailwind-config", "svelte-navigator"],
  },
  plugins: [svelte(), crx({ manifest })],
  resolve: {
    alias: {
      src: srcDir,
      "tailwind-config": path.resolve(__dirname, "./tailwind.config.js"),
    },
  },
});
