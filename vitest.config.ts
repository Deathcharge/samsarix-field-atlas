import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "client/src/main.tsx",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/**",
        "tests/**",
      ],
      include: ["client/src/**/*.{ts,tsx}", "server/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 70,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    maxWorkers: 1,
    pool: "vmThreads",
    restoreMocks: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 60_000,
  },
});
