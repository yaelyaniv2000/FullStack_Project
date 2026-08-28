import { defineConfig } from "vitest/config";

/**
 * Separate, opt-in config for tests that hit a real Supabase project (RLS/authorization
 * boundaries, the core generate-schedule-and-publish business flow) -- see docs/test-spec.md.
 * Kept out of `npm test` on purpose: these need a real .env.local pointing at a migrated Supabase
 * project, which won't exist for every environment this repo is checked out into. Run explicitly
 * via `npm run test:integration`.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/integration/setup-env.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Files run sequentially, not in parallel workers: each file creates real ephemeral users via
    // the Supabase Auth Admin API, and running them concurrently risks tripping Auth rate limits
    // on a free/dev project (observed once as a flaky afterAll failure) for no real benefit --
    // this suite is small enough that sequential is still fast.
    fileParallelism: false,
  },
});
