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
 * date) since `assignments` doesn't exist yet (the scheduling engine is Phase 5) -- revisit
 * once it does.
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

export type PendingApproval = {
  id: string;
  workerId: string;
  workerName: string;
  qualificationName: string;
  optionLabel: string | null;
  obtainedAt: string;
};

type PendingApprovalRow = {
  id: string;
  worker_id: string;
  obtained_at: string;
  worker: { full_name: string } | null;
  qualification: { name: string } | null;
  option: { label: string } | null;
};

export async function listPendingApprovals(limit: number): Promise<PendingApproval[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_qualifications")
    .select(
      `id, worker_id, obtained_at,
      worker:profiles!worker_qualifications_worker_id_fkey(full_name),
      qualification:qualifications(name),
      option:qualification_options(label)`,
    )
    .eq("status", "pending")
    .order("obtained_at", { ascending: true })
    .limit(limit);

  return ((data as unknown as PendingApprovalRow[]) ?? []).map((r) => ({
    id: r.id,
    workerId: r.worker_id,
    workerName: r.worker?.full_name ?? "",
    qualificationName: r.qualification?.name ?? "",
    optionLabel: r.option?.label ?? null,
    obtainedAt: r.obtained_at,
  }));
}

export type ExpiringQualification = {
  id: string;
  workerId: string;
  workerName: string;
  qualificationName: string;
  expiresOn: string;
};

type ExpiringRow = {
  id: string;
  worker_id: string;
  obtained_at: string;
  worker: { full_name: string } | null;
  qualifications: { name: string; renewal_interval_days: number | null } | null;
};

export async function listExpiringQualifications(
  withinDays: number,
  limit: number,
): Promise<ExpiringQualification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_qualifications")
    .select(
      `id, worker_id, obtained_at,
      worker:profiles!worker_qualifications_worker_id_fkey(full_name),
      qualifications(name, renewal_interval_days)`,
    )
    .eq("status", "approved");

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + withinDays);
  const thresholdStr = threshold.toISOString().slice(0, 10);

  return ((data as unknown as ExpiringRow[]) ?? [])
    .map((r) => ({
      id: r.id,
      workerId: r.worker_id,
      workerName: r.worker?.full_name ?? "",
      qualificationName: r.qualifications?.name ?? "",
      expiresOn: computeExpiresOn(r.obtained_at, r.qualifications?.renewal_interval_days ?? null),
    }))
    .filter((r): r is ExpiringQualification & { expiresOn: string } => r.expiresOn !== null && r.expiresOn <= thresholdStr)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
    .slice(0, limit);
}
