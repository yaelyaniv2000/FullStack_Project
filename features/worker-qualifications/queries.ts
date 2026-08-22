import { createClient } from "@/lib/supabase/server";

export type WorkerQualification = {
  id: string;
  qualificationId: string;
  qualificationName: string;
  renewalIntervalDays: number | null;
  optionId: string | null;
  optionLabel: string | null;
  source: "self_reported" | "admin_granted";
  status: "pending" | "approved" | "rejected";
  obtainedAt: string;
  expiresOn: string | null;
};

type Row = {
  id: string;
  qualification_id: string;
  option_id: string | null;
  source: "self_reported" | "admin_granted";
  status: "pending" | "approved" | "rejected";
  obtained_at: string;
  qualifications: { name: string; renewal_interval_days: number | null } | null;
  qualification_options: { label: string } | null;
};

/**
 * Simplified read of the expiry formula in docs/technical-plan.md: obtained_at plus the
 * renewal interval. Doesn't yet fold in shift-based renewal (max completed renewing-shift
 * date) since shifts/assignments don't exist yet (Phase 5) -- revisit once they do.
 */
function computeExpiresOn(obtainedAt: string, renewalIntervalDays: number | null): string | null {
  if (renewalIntervalDays === null) return null;
  const date = new Date(obtainedAt);
  date.setDate(date.getDate() + renewalIntervalDays);
  return date.toISOString().slice(0, 10);
}

export async function listWorkerQualifications(workerId: string): Promise<WorkerQualification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_qualifications")
    .select(
      "id, qualification_id, option_id, source, status, obtained_at, qualifications(name, renewal_interval_days), qualification_options(label)",
    )
    .eq("worker_id", workerId)
    .order("obtained_at", { ascending: false });

  return ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    qualificationId: r.qualification_id,
    qualificationName: r.qualifications?.name ?? "",
    renewalIntervalDays: r.qualifications?.renewal_interval_days ?? null,
    optionId: r.option_id,
    optionLabel: r.qualification_options?.label ?? null,
    source: r.source,
    status: r.status,
    obtainedAt: r.obtained_at,
    expiresOn: computeExpiresOn(r.obtained_at, r.qualifications?.renewal_interval_days ?? null),
  }));
}
