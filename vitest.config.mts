import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Component tests render whole screens; the first render in a cold run can exceed the 5s default.
    testTimeout: 30000,
    // Agent worktrees live under .claude/; their copies of the tests must not run here.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
});
