import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import { createEphemeralUser, deleteEphemeralUser, signInAs, uniqueName, type EphemeralUser } from "./helpers";

/**
 * End-to-end test for the product's core business process (see docs/test-spec.md and Phase 5/
 * TODO.md): create a shift -> worker submits availability -> admin generates the schedule ->
 * admin publishes -> the worker sees their shift, and only after publish (RLS's publish-timing
 * rule, not just a role check).
 *
 * Runs the real Server Actions (createPosition, createAvailabilityWindow, createShift,
 * submitAvailability, generateSchedule, publishShift) against a real Supabase project, swapping
 * only the two pieces of Next.js request plumbing those actions can't function without outside a
 * real request (createClient's cookie access, revalidatePath's static-generation store) -- same
 * technique as tests/integration/authorization.test.ts.
 */
let currentClient: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => currentClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createPosition } = await import("@/features/positions/actions");
const { createAvailabilityWindow } = await import("@/features/availability-windows/actions");
const { createShift } = await import("@/features/shifts/actions");
const { submitAvailability } = await import("@/features/availability/actions");
const { generateSchedule, publishShift } = await import("@/features/scheduling/actions");

const service = createAdminClient();

let admin: EphemeralUser;
let worker: EphemeralUser;
let adminClient: SupabaseClient<Database>;
let workerClient: SupabaseClient<Database>;

let positionId: string;
let windowId: string;
let shiftId: string;

beforeAll(async () => {
  admin = await createEphemeralUser("admin", "core-flow-admin");
  worker = await createEphemeralUser("worker", "core-flow-worker");
  adminClient = await signInAs(admin.email, admin.password);
  workerClient = await signInAs(worker.email, worker.password);
});

afterAll(async () => {
  await service.from("notifications").delete().eq("worker_id", worker.id);
  if (shiftId) await service.from("shifts").delete().eq("id", shiftId);
  if (windowId) await service.from("availability_windows").delete().eq("id", windowId);
  if (positionId) await service.from("positions").delete().eq("id", positionId);
  await Promise.all([admin, worker].map((u) => deleteEphemeralUser(u.id)));
});

describe("core flow: shift -> availability -> generate -> publish -> worker sees it", () => {
  test("admin sets up a position, availability window, and shift with one open slot", async () => {
    currentClient = adminClient;

    const positionForm = new FormData();
    positionForm.set("name", uniqueName("position"));
    const positionResult = await createPosition(undefined, positionForm);
    expect(positionResult).toMatchObject({ success: true });
    if (positionResult?.success) positionId = positionResult.data.id;

    const windowForm = new FormData();
    windowForm.set("label", uniqueName("window"));
    windowForm.set("opensAt", "2026-09-01T00:00:00.000Z");
    windowForm.set("closesAt", "2026-09-14T00:00:00.000Z");
    const windowResult = await createAvailabilityWindow(undefined, windowForm);
    expect(windowResult).toMatchObject({ success: true });
    if (windowResult?.success) windowId = windowResult.data.id;

    const shiftForm = new FormData();
    const shiftName = uniqueName("shift");
    shiftForm.set("name", shiftName);
    shiftForm.set("date", "2026-09-20");
    shiftForm.set("startTime", "08:00");
    shiftForm.set("endTime", "16:00");
    shiftForm.set("availabilityWindowId", windowId);
    shiftForm.append("positionId", positionId);
    shiftForm.append("headcountNeeded", "1");
    const shiftResult = await createShift(undefined, shiftForm);
    expect(shiftResult).toMatchObject({ success: true });

    const { data: shift } = await service.from("shifts").select("id").eq("name", shiftName).single();
    expect(shift).not.toBeNull();
    shiftId = shift!.id;
  });

  test("worker marks themselves available for the shift", async () => {
    currentClient = workerClient;
    const result = await submitAvailability([shiftId], true);
    expect(result).toMatchObject({ success: true });

    const { data } = await service
      .from("availability")
      .select("is_available")
      .eq("worker_id", worker.id)
      .eq("shift_id", shiftId)
      .single();
    expect(data?.is_available).toBe(true);
  });

  test("admin generates the schedule and it fills the slot with the available worker", async () => {
    currentClient = adminClient;
    const result = await generateSchedule(windowId);
    expect(result).toMatchObject({ success: true, data: { proposedCount: 1, unfilledSlots: [] } });

    const { data } = await service
      .from("assignments")
      .select("worker_id")
      .eq("shift_id", shiftId)
      .eq("position_id", positionId);
    expect(data).toEqual([{ worker_id: worker.id }]);
  });

  test("the worker cannot see the assignment before publish (RLS publish-timing rule)", async () => {
    const { data } = await workerClient.from("assignments").select("worker_id").eq("shift_id", shiftId);
    expect(data).toHaveLength(0);
  });

  test("admin publishes the shift", async () => {
    currentClient = adminClient;
    const result = await publishShift(windowId, shiftId);
    expect(result).toMatchObject({ success: true });

    const { data: shift } = await service.from("shifts").select("published_at").eq("id", shiftId).single();
    expect(shift?.published_at).not.toBeNull();
  });

  test("the worker now sees their assignment and a notification, via their own real session", async () => {
    const { data: assignments } = await workerClient
      .from("assignments")
      .select("worker_id")
      .eq("shift_id", shiftId);
    expect(assignments).toEqual([{ worker_id: worker.id }]);

    const { data: notifications } = await workerClient
      .from("notifications")
      .select("shift_id")
      .eq("shift_id", shiftId);
    expect(notifications).toHaveLength(1);
  });
});
