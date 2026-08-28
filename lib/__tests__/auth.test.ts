import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * requireAdmin/requireWorker are the app-layer half of this app's two-layer authorization model
 * (the other half -- RLS -- is covered by tests/integration/authorization.test.ts against a real
 * Supabase project). Here `@/lib/supabase/server` is mocked with an in-memory fake so these run
 * fast with no network: only `auth.getUser()` + a `profiles` select are exercised, which is all
 * getCurrentUser() touches.
 *
 * next/navigation's redirect() throws unconditionally (confirmed by reading
 * node_modules/next/dist/client/components/redirect.js) -- it doesn't need a real request
 * context, so it's safe to call for real here rather than mocking it away.
 */

type FakeUser = { id: string; role: "admin" | "worker" } | null;
let currentUser: FakeUser = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser ? { id: currentUser.id } : null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: currentUser
              ? { id: currentUser.id, full_name: "Test", role: currentUser.role, created_at: "" }
              : null,
          }),
        }),
      }),
    }),
  }),
}));

const { requireAdmin, requireWorker } = await import("@/lib/auth");

function isRedirectTo(error: unknown, path: string): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT;") &&
    error.digest.includes(`;${path};`)
  );
}

describe("requireAdmin", () => {
  beforeEach(() => {
    currentUser = null;
  });

  test("redirects an unauthenticated visitor to /login", async () => {
    await expect(requireAdmin()).rejects.toSatisfy((e: unknown) => isRedirectTo(e, "/login"));
  });

  test("redirects a worker to /dashboard", async () => {
    currentUser = { id: "w1", role: "worker" };
    await expect(requireAdmin()).rejects.toSatisfy((e: unknown) => isRedirectTo(e, "/dashboard"));
  });

  test("returns the profile for an admin", async () => {
    currentUser = { id: "a1", role: "admin" };
    const profile = await requireAdmin();
    expect(profile).toMatchObject({ id: "a1", role: "admin" });
  });
});

describe("requireWorker", () => {
  beforeEach(() => {
    currentUser = null;
  });

  test("redirects an unauthenticated visitor to /login", async () => {
    await expect(requireWorker()).rejects.toSatisfy((e: unknown) => isRedirectTo(e, "/login"));
  });

  test("redirects an admin to /dashboard", async () => {
    currentUser = { id: "a1", role: "admin" };
    await expect(requireWorker()).rejects.toSatisfy((e: unknown) => isRedirectTo(e, "/dashboard"));
  });

  test("returns the profile for a worker", async () => {
    currentUser = { id: "w1", role: "worker" };
    const profile = await requireWorker();
    expect(profile).toMatchObject({ id: "w1", role: "worker" });
  });
});
