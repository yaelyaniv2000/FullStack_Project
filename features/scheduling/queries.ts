import { createClient } from "@/lib/supabase/server";

export type ConstraintType = "min_rest_hours" | "max_shifts_per_window";

export type ConstraintRow = {
  id: string;
  type: ConstraintType;
  qualificationOptionId: string | null;
  qualificationName: string | null;
  optionLabel: string | null;
  enabled: boolean;
  value: number;
};

type RawConstraintRow = {
  id: string;
  type: ConstraintType;
  qualification_option_id: string | null;
  enabled: boolean;
  value: number;
  option: { label: string; qualification: { name: string } | null } | null;
};

export async function listSchedulingConstraints(): Promise<ConstraintRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scheduling_constraints")
    .select(
      `id, type, qualification_option_id, enabled, value,
      option:qualification_options!scheduling_constraints_qualification_option_id_fkey(
        label, qualification:qualifications!qualification_options_qualification_id_fkey(name)
      )`,
    )
    .order("type", { ascending: true });

  return ((data as unknown as RawConstraintRow[]) ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    qualificationOptionId: r.qualification_option_id,
    qualificationName: r.option?.qualification?.name ?? null,
    optionLabel: r.option?.label ?? null,
    enabled: r.enabled,
    value: r.value,
  }));
}

export type PairingPreference = "avoid" | "prefer_avoid" | "prefer";

export type WorkerPairing = {
  id: string;
  workerId1: string;
  workerName1: string;
  workerId2: string;
  workerName2: string;
  preference: PairingPreference;
};

type RawPairing = {
  id: string;
  worker_id_1: string;
  worker_id_2: string;
  preference: PairingPreference;
  worker1: { full_name: string } | null;
  worker2: { full_name: string } | null;
};

export async function listWorkerPairingPreferences(): Promise<WorkerPairing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_pairing_preferences")
    .select(
      `id, worker_id_1, worker_id_2, preference,
      worker1:profiles!worker_pairing_preferences_worker_id_1_fkey(full_name),
      worker2:profiles!worker_pairing_preferences_worker_id_2_fkey(full_name)`,
    )
    .order("created_at", { ascending: false });

  return ((data as unknown as RawPairing[]) ?? []).map((r) => ({
    id: r.id,
    workerId1: r.worker_id_1,
    workerName1: r.worker1?.full_name ?? "",
    workerId2: r.worker_id_2,
    workerName2: r.worker2?.full_name ?? "",
    preference: r.preference,
  }));
}
