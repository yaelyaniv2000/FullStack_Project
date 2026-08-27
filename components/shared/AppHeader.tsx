"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type NavLink = { href: string; label: string };

/**
 * Shared across roles -- admin and worker layouts each pass their own `links`, rather than
 * having two separate hardcoded nav components (see docs/technical-plan.md).
 *
 * Hamburger trigger and the Sheet it opens are both docked to the same (right) edge -- the empty
 * spacer on the other side matches the trigger button's width (`size-8`, see button.tsx) so the
 * logo lands genuinely centered, not just visually close.
 */
export function AppHeader({
  links,
  logoutAction,
}: {
  links: NavLink[];
  logoutAction: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="פתיחת תפריט" />}>
          <Menu />
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>ניווט</SheetTitle>
          </SheetHeader>
          <nav className="grid grid-cols-1 gap-3 p-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-20 items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-colors hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 pt-0">
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="w-full">
                התנתקות
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
      <Link href="/dashboard" className="flex items-center gap-2 text-2xl font-bold">
        המשבצת
        <Plane className="size-6" />
      </Link>
      <div className="size-8" aria-hidden />
    </header>
  );
}