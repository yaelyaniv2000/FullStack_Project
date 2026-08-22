"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
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
      <Link href="/dashboard" className="text-lg font-bold">
        המשבצת
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" aria-label="פתיחת תפריט" />}
        >
          <Menu />
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>ניווט</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 p-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="underline"
              >
                {link.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="w-full">
                התנתקות
              </Button>
            </form>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}