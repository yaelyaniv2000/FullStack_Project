import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import {
  createEphemeralUser,
  deleteEphemeralUser,
  signInAs,
  uniqueName,
  type EphemeralUser,
} from "./helpers";

/**
 * The app's authorization model has two layers (see CLAUDE.md's "assignments has no status
 * column" bullet and the RLS migration's comments): an app-layer guard (requireAdmin/requireWorker
 * -- unit-tested with a mock in lib/__tests__/auth.test.ts) and the real boundary underneath it,
 * Postgres RLS. This suite exercises the RLS layer directly against a real Supabase project,
 * plus one check that the two layers are actually wired together (calling a real admin-only
 * Server Action with a worker's real session).
 *
 * `@/lib/supabase/server`'s createClient() is mocked to return whichever real, signed-in
 * supabase-js client the current test needs -- the action code under test is the real,
 * unmodified action, not a reimplementation.
 */
let currentClient: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => currentClient,
}));
// revalidatePath needs a real Next.js request context (static generation store) that doesn't
// exist when calling a Server Action directly from a test -- transport plumbing, not business
// logic, same category as the createClient mock above.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createQualification, deleteQualification } = await import("@/features/qualifications/actions");

let admin: EphemeralUser;
let worker1: EphemeralUser;
let worker2: EphemeralUser;
let adminClient: SupabaseClient<Database>;
let worker1Client: SupabaseClient<Database>;
let worker2Client: SupabaseClient<Database>;

const service = createAdminClient();
const cleanupIds = {
  qualifications: [] as string[],
  workerQualifications: [] as string[],
  shiftTemplates: [] as string[],
  positions: [] as string[],
  shifts: [] as string[],
};

beforeAll(async () => {
  admin = await createEphemeralUser("admin", "authz-admin");
  worker1 = await createEphemeralUser("worker", "authz-w1");
  worker2 = await createEphemeralUser("worker", "authz-w2");
  adminClient = await signInAs(admin.email, admin.password);
  worker1Client = await signInAs(worker1.email, worker1.password);
  worker2Client = await signInAs(worker2.email, worker2.password);
});

afterAll(async () => {
  if (cleanupIds.shifts.length) await service.from("shifts").delete().in("id", cleanupIds.shifts);
  if (cleanupIds.shiftTemplates.length)
    await service.from("shift_templates").delete().in("id", cleanupIds.shiftTemplates);
  if (cleanupIds.workerQualifications.length)
    await service.from("worker_qualifications").delete().in("id", cleanupIds.workerQualifications);
  if (cleanupIds.positions.length) await service.from("positions").delete().in("id", cleanupIds.positions);
  if (cleanupIds.qualifications.length)
    await service.from("qualifications").delete().in("id", cleanupIds.qualifications);
  await Promise.all([admin, worker1, worker2].map((u) => deleteEphemeralUser(u.id)));
});

function isRedirectTo(error: unknown, path: string): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT;") &&
    error.digest.includes(`;${path};`)
  );
}

describe("app-layer guard + RLS wired together", () => {
  test("a worker calling an admin-only Server Action is redirected, not just refused data", async () => {
    currentClient = worker1Client;
    const formData = new FormData();
    formData.set("name", uniqueName("qual-blocked"));
    await expect(createQualification(undefined, formData)).rejects.toSatisfy((e: unknown) =>
      isRedirectTo(e, "/dashboard"),
    );
  });

  test("an admin calling the same action succeeds end to end against real RLS", async () => {
    currentClient = adminClient;
    const formData = new FormData();
    const name = uniqueName("qual-allowed");
    formData.set("name", name);
    const result = await createQualification(undefined, formData);
    expect(result).toMatchObject({ success: true });

    const { data } = await service.from("qualifications").select("id").eq("name", name).single();
    expect(data).not.toBeNull();
    if (data) {
      cleanupIds.qualifications.push(data.id);
      const deleteResult = await deleteQualification(data.id);
      expect(deleteResult).toMatchObject({ success: true });
      if (deleteResult.success) {
        cleanupIds.qualifications = cleanupIds.qualifications.filter((id) => id !== data.id);
      }
    }
  });
});

describe("RLS: worker_qualifications", () => {
  test("a worker cannot read another worker's qualification rows", async () => {
    const { data: qual } = await service
      .from("qualifications")
      .insert({ name: uniqueName("qual-w1-private"), renewal_interval_days: null })
      .select()
      .single();
    if (!qual) throw new Error("setup failed");
    cleanupIds.qualifications.push(qual.id);

    const { data: wq } = await service
      .from("worker_qualifications")
      .insert({
        worker_id: worker1.id,
        qualification_id: qual.id,
        source: "admin_granted",
        status: "approved",
        obtained_at: "2026-01-01",
      })
      .select()
      .single();
    if (!wq) throw new Error("setup failed");
    cleanupIds.workerQualifications.push(wq.id);

    const { data: ownRead } = await worker1Client
      .from("worker_qualifications")
      .select("id")
      .eq("id", wq.id);
    expect(ownRead).toHaveLength(1);

    const { data: otherRead } = await worker2Client
      .from("worker_qualifications")
      .select("id")
      .eq("id", wq.id);
    expect(otherRead).toHaveLength(0);
  });
});

describe("RLS: shift_templates (admin-only, no worker visibility at all)", () => {
  test("a worker cannot create a shift template", async () => {
    const { error } = await worker1Client
      .from("shift_templates")
      .insert({ name: uniqueName("template-blocked") });
    expect(error).not.toBeNull();
  });

  test("a worker cannot even read shift templates", async () => {
    const { data: template } = await service
      .from("shift_templates")
      .insert({ name: uniqueName("template-hidden") })
      .select()
      .single();
    if (!template) throw new Error("setup failed");
    cleanupIds.shiftTemplates.push(template.id);

    const { data } = await worker1Client.from("shift_templates").select("id").eq("id", template.id);
    expect(data).toHaveLength(0);
  });
});

describe("RLS: assignments publish-timing (the timing-based rule, not just a role check)", () => {
  test("a worker cannot see their own assignment before the shift is published, only after", async () => {
    const { data: position } = await service
      .from("positions")
      .insert({ name: uniqueName("position") })
      .select()
      .single();
    if (!position) throw new Error("setup failed");
    cleanupIds.positions.push(position.id);

    const { data: shift } = await service
      .from("shifts")
      .insert({
        name: uniqueName("shift"),
        date: "2026-09-15",
        start_time: "08:00",
        end_time: "16:00",
        published_at: null,
      })
      .select()
      .single();
    if (!shift) throw new Error("setup failed");
    cleanupIds.shifts.push(shift.id);

    await service
      .from("shift_positions")
      .insert({ shift_id: shift.id, position_id: position.id, headcount_needed: 1 });
    await service
      .from("assignments")
      .insert({ shift_id: shift.id, position_id: position.id, worker_id: worker1.id, created_by: null });

    const beforePublish = await worker1Client
      .from("assignments")
      .select("worker_id")
      .eq("shift_id", shift.id);
    expect(beforePublish.data).toHaveLength(0);

    await service.from("shifts").update({ published_at: new Date().toISOString() }).eq("id", shift.id);

    const afterPublish = await worker1Client
      .from("assignments")
      .select("worker_id")
      .eq("shift_id", shift.id);
    expect(afterPublish.data).toHaveLength(1);

    // Admin sees it regardless of publish state.
    const asAdmin = await adminClient.from("assignments").select("worker_id").eq("shift_id", shift.id);
    expect(asAdmin.data).toHaveLength(1);
  });
});
