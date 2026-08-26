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
 * Expiry formula from docs/technical-plan.md: latest(obtained_at, completed renewing shifts for
 * that worker) plus the renewal interval. `latestRenewalDate` is the most recent date among
 * completed (published, end time passed) shifts where the worker fulfilled a position that
 * renews this qualification -- see getLatestRenewalDates.
 */
function computeExpiresOn(
  obtainedAt: string,
  renewalIntervalDays: number | null,
  latestRenewalDate?: string,
): string | null {
  if (renewalIntervalDays === null) return null;
  const base = latestRenewalDate && latestRenewalDate > obtainedAt ? latestRenewalDate : obtainedAt;
  const date = new Date(base);
  date.setDate(date.getDate() + renewalIntervalDays);
  return date.toISOString().slice(0, 10);
}

type RenewalAssignmentRow = {
  worker_id: string;
  position_id: string;
  shift: { date: string; end_time: string; published_at: string | null } | null;
};

/**
 * Maps `${workerId}:${qualificationId}` to the latest date a completed shift renewed that
 * qualification for that worker. A shift only counts once it's published and its end time has
 * passed (see CLAUDE.md's "completed" definition) -- an unpublished or still-upcoming assignment
 * isn't a real completed shift yet. Scoped to one worker when possible to keep the query small.
 */
async function getLatestRenewalDates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workerId?: string,
): Promise<Map<string, string>> {
  const { data: renews } = await supabase
    .from("position_renews_qualifications")
    .select("position_id, qualification_id");

  const qualificationIdsByPosition = new Map<string, string[]>();
  for (const r of renews ?? []) {
    const list = qualificationIdsByPosition.get(r.position_id) ?? [];
    list.push(r.qualification_id);
    qualificationIdsByPosition.set(r.position_id, list);
  }
  if (qualificationIdsByPosition.size === 0) return new Map();

  let query = supabase
    .from("assignments")
    .select(
      "worker_id, position_id, shift:shifts!assignments_shift_id_fkey(date, end_time, published_at)",
    )
    .in("position_id", [...qualificationIdsByPosition.keys()]);
  if (workerId) query = query.eq("worker_id", workerId);
  const { data: assignments } = await query;

  const now = new Date();
  const latest = new Map<string, string>();
  for (const a of (assignments as unknown as RenewalAssignmentRow[]) ?? []) {
    if (!a.shift?.published_at) continue;
    if (new Date(`${a.shift.date}T${a.shift.end_time}`) >= now) continue;
    for (const qualificationId of qualificationIdsByPosition.get(a.position_id) ?? []) {
      const key = `${a.worker_id}:${qualificationId}`;
      const existing = latest.get(key);
      if (!existing || a.shift.date > existing) latest.set(key, a.shift.date);
    }
  }
  return latest;
}

export async function listWorkerQualifications(workerId: string): Promise<WorkerQualification[]> {
  const supabase = await createClient();
  const [{ data }, renewalDates] = await Promise.all([
    supabase
      .from("worker_qualifications")
      .select(
        "id, qualification_id, option_id, source, status, obtained_at, qualifications(name, renewal_interval_days), qualification_options(label)",
      )
      .eq("worker_id", workerId)
      .order("obtained_at", { ascending: false }),
    getLatestRenewalDates(supabase, workerId),
  ]);

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
    expiresOn: computeExpiresOn(
      r.obtained_at,
      r.qualifications?.renewal_interval_days ?? null,
      renewalDates.get(`${workerId}:${r.qualification_id}`),
    ),
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
  qualification_id: string;
  obtained_at: string;
  worker: { full_name: string } | null;
  qualifications: { name: string; renewal_interval_days: number | null } | null;
};

export async function listExpiringQualifications(
  withinDays: number,
  limit: number,
): Promise<ExpiringQualification[]> {
  const supabase = await createClient();
  const [{ data }, renewalDates] = await Promise.all([
    supabase
      .from("worker_qualifications")
      .select(
        `id, worker_id, qualification_id, obtained_at,
        worker:profiles!worker_qualifications_worker_id_fkey(full_name),
        qualifications(name, renewal_interval_days)`,
      )
      .eq("status", "approved"),
    getLatestRenewalDates(supabase),
  ]);

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + withinDays);
  const thresholdStr = threshold.toISOString().slice(0, 10);

  return ((data as unknown as ExpiringRow[]) ?? [])
    .map((r) => ({
      id: r.id,
      workerId: r.worker_id,
      workerName: r.worker?.full_name ?? "",
      qualificationName: r.qualifications?.name ?? "",
      expiresOn: computeExpiresOn(
        r.obtained_at,
        r.qualifications?.renewal_interval_days ?? null,
        renewalDates.get(`${r.worker_id}:${r.qualification_id}`),
      ),
    }))
    .filter((r): r is ExpiringQualification & { expiresOn: string } => r.expiresOn !== null && r.expiresOn <= thresholdStr)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
    .slice(0, limit);
}
