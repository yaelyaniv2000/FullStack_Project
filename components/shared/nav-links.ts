import type { NavLink } from "./AppHeader";

export const ADMIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "דשבורד" },
  { href: "/admin/qualifications", label: "כשירויות" },
  { href: "/admin/positions", label: "תפקידים" },
  { href: "/admin/personnel", label: "אנשי צוות" },
];

export const WORKER_LINKS: NavLink[] = [{ href: "/dashboard", label: "דשבורד" }];