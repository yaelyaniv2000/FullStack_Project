import type { NavLink } from "./AppHeader";

export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/qualifications", label: "כשירויות" },
  { href: "/admin/positions", label: "תפקידים" },
  { href: "/admin/shift-templates", label: "תבניות משמרת" },
  { href: "/admin/shifts", label: "משמרות" },
  { href: "/admin/availability-windows", label: "חלונות זמינות" },
  { href: "/admin/personnel", label: "אנשי צוות" },
  { href: "/admin/settings", label: "הגדרות" },
];

export const WORKER_LINKS: NavLink[] = [
  { href: "/my-qualifications", label: "הכשירויות שלי" },
  { href: "/availability", label: "הגשת זמינות" },
  { href: "/my-shifts", label: "המשמרות שלי" },
];