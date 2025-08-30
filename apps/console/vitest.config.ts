import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  setupFiles: [],
  include: ["tests/unit/**/*.test.{ts,tsx,js,jsx}"],
  exclude: ["tests/e2e/**", "node_modules"]
  }
});
