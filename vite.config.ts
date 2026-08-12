import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  optimizeDeps: { exclude: ["z3-solver"] },
  test: { testTimeout: 180000, hookTimeout: 180000 },
});
