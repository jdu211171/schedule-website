import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default defineConfig({
  test: {
    include: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "specs/**/*.test.ts",
      "specs/**/*.test.tsx",
    ],
    environment: "node",
    pool: "forks",
    globals: false,
    reporters: ["default"],
    setupFiles: ["./vitest.setup.ts"],
  },
  css: {
    // Prevent Vite from loading the project's PostCSS config during tests
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@/*": path.join(fileURLToPath(new URL("./src", import.meta.url)), "*"),
    },
  },
});
