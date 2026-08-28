import { defineConfig } from "vitest/config";

/**
 * Fast, dependency-free suite: pure-logic unit tests (node environment) plus React Testing
 * Library component tests (jsdom, opted into per-file via a `// @vitest-environment jsdom`
 * docblock -- see e.g. features/availability/__tests__/AvailabilityShiftRow.test.tsx). No React
 * plugin needed: esbuild already transforms JSX per tsconfig's `"jsx": "react-jsx"`.
 *
 * Deliberately excludes tests/integration/** -- those hit a real Supabase project (see
 * vitest.integration.config.mts) and would fail for anyone running `npm test` without a
 * configured .env.local, which this config must not do.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "tests/integration/**"],
    setupFiles: ["./tests/setup-rtl.ts"],
  },
});
