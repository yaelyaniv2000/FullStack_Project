import { defineConfig } from "vitest/config";

/**
 * Unit-test scope only for now (Phase 5, brought forward from Phase 6 to test the scheduling
 * heuristic -- see TODO.md's test-infra sequencing note, 2026-08-27). No jsdom/React plugin yet
 * since these tests exercise plain functions, not components -- add those when Phase 6 brings in
 * React Testing Library.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
  },
});
