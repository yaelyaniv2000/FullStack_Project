import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { AppHeader, type NavLink } from "@/components/shared/AppHeader";

const ADMIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "דשבורד" },
  { href: "/admin/qualifications", label: "כשירויות" },
  { href: "/admin/personnel", label: "אנשי צוות" },
];
const WORKER_LINKS: NavLink[] = [{ href: "/dashboard", label: "דשבורד" }];

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader
        links={profile.role === "admin" ? ADMIN_LINKS : WORKER_LINKS}
        logoutAction={logout}
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">
          שלום, {profile.full_name} ({profile.role === "admin" ? "מנהל" : "עובד"})
        </h1>

        {profile.role !== "admin" ? (
          <p className="text-muted-foreground">
            כאן יופיעו בעתיד המשמרות הקרובות שלך וסטטוס הכשירויות שלך.
          </p>
        ) : null}
      </div>
    </div>
  );
}