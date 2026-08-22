import { requireAdmin } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { AppHeader } from "@/components/shared/AppHeader";
import { ADMIN_LINKS } from "@/components/shared/nav-links";

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