import { requireWorker } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { AppHeader } from "@/components/shared/AppHeader";
import { WORKER_LINKS } from "@/components/shared/nav-links";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWorker();
  return (
    <div className="min-h-screen">
      <AppHeader links={WORKER_LINKS} logoutAction={logout} />
      <div className="mx-auto max-w-3xl p-6">{children}</div>
    </div>
  );
}
