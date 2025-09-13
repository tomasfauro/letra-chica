import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/": path.resolve(__dirname, "src") + "/",
      "@rules": path.resolve(__dirname, "src/rules"),
      "@rules/": path.resolve(__dirname, "src/rules") + "/",
      "@lib": path.resolve(__dirname, "src/lib"),
      "@lib/": path.resolve(__dirname, "src/lib") + "/",
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: [],
  },
});
