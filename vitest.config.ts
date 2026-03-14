import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup/vitest.setup.ts"],
          testTimeout: 10_000,
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup/vitest.setup.ts"],
          testTimeout: 30_000,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "e2e",
          include: ["tests/e2e/**/*.test.ts"],
          setupFiles: ["tests/setup/vitest.setup.ts"],
          testTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
