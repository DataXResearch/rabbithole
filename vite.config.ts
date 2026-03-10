/// <reference types="vitest" />
import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import manifest from "./manifest.json";

const srcDir = resolve(__dirname, "src");

export default defineConfig({
  plugins: [svelte(), crx({ manifest }), nodePolyfills()],
  resolve: {
    alias: {
      src: srcDir,
    },
  },
  build: {
    rollupOptions: {
      input: {
        trail: resolve(__dirname, "src/trail/trail.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["@svelteuidev/core", "@svelteuidev/composables"],
      },
    },
  },
});
