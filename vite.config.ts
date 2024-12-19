import { defineConfig } from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      "$": path.resolve("./src/lib"),
    },
  },
});
