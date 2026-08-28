import path from "node:path";

/**
 * Vitest doesn't load .env.local the way `next dev`/`next build` do -- this loads it manually so
 * the integration suite can reach the real Supabase project via the same env vars the app itself
 * uses. Requires Node 20.6+ (process.loadEnvFile).
 */
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Missing .env.local (e.g. CI with real env vars already injected) -- fall through and let the
  // tests fail with a clear "missing Supabase env var" error instead of a confusing ENOENT here.
}
