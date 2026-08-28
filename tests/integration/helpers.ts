import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

/** Every test-created row uses this prefix so it's unmistakable in the DB and trivially
 * distinguishable from real/seeded data if cleanup ever fails partway. */
export const TEST_PREFIX = "__test__";

export function uniqueName(label: string): string {
  return `${TEST_PREFIX} ${label} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type EphemeralUser = { id: string; email: string; password: string };

/**
 * Creates a real auth user + profiles row, the same two-step path createWorkerAccount uses (see
 * features/accounts/actions.ts) -- for an admin there's no such action (v1 has exactly one admin,
 * created manually), so this does the equivalent directly via the service-role client for both
 * roles.
 */
export async function createEphemeralUser(role: "admin" | "worker", label: string): Promise<EphemeralUser> {
  const admin = createAdminClient();
  const email = `${TEST_PREFIX}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "test-password-123";

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`failed to create ephemeral ${role} user: ${error?.message}`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, full_name: uniqueName(label), role });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`failed to create profile for ephemeral ${role} user: ${profileError.message}`);
  }

  return { id: data.user.id, email, password };
}

/** Deletes the auth user (cascades to `profiles` and everything with `on delete cascade` back to
 * it -- worker_qualifications, availability, assignments.worker_id, notifications). Anything
 * referencing the user via a plain `references profiles(id)` with no cascade (e.g.
 * assignments.created_by) must be cleaned up by the caller first, or this fails with an FK error. */
export async function deleteEphemeralUser(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
}

/** A real, signed-in supabase-js client (anon key + a real session) -- used as the value the
 * mocked `@/lib/supabase/server`'s createClient() returns, so the actual server actions run for
 * real against real RLS, not a re-implementation of the policy logic. */
export async function signInAs(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}
