import { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  message: string;
  shiftId: string | null;
  createdAt: string;
  readAt: string | null;
};

export async function listMyNotifications(workerId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, message, shift_id, created_at, read_at")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((n) => ({
    id: n.id,
    message: n.message,
    shiftId: n.shift_id,
    createdAt: n.created_at,
    readAt: n.read_at,
  }));
}

export async function countUnreadNotifications(workerId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", workerId)
    .is("read_at", null);
  return count ?? 0;
}
