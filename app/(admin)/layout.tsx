import { requireAdmin } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { AppHeader, type NavLink } from "@/components/shared/AppHeader";

const ADMIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "דשבורד" },
  { href: "/admin/qualifications", label: "כשירויות" },
  { href: "/admin/personnel", label: "אנשי צוות" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <AppHeader links={ADMIN_LINKS} logoutAction={logout} />
      <div className="mx-auto max-w-3xl p-6">{children}</div>
    </div>
  );
}