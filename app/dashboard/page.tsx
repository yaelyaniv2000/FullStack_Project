import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { AppHeader } from "@/components/shared/AppHeader";
import { ADMIN_LINKS, WORKER_LINKS } from "@/components/shared/nav-links";
import { AdminDashboard } from "@/features/dashboard/components/AdminDashboard";
import { WorkerDashboard } from "@/features/dashboard/components/WorkerDashboard";

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader
        links={profile.role === "admin" ? ADMIN_LINKS : WORKER_LINKS}
        logoutAction={logout}
      />
      <div
        className={`mx-auto flex flex-col gap-4 p-6 ${profile.role === "admin" ? "max-w-6xl" : "max-w-3xl"}`}
      >
        <h1 className="text-2xl font-bold">
          שלום, {profile.full_name} ({profile.role === "admin" ? "מנהל" : "עובד"})
        </h1>

        {profile.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <WorkerDashboard workerId={profile.id} />
        )}
      </div>
    </div>
  );
}