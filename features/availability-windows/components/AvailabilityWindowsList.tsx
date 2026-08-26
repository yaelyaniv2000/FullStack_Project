"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityWindowForm } from "./AvailabilityWindowForm";
import { deleteAvailabilityWindow } from "@/features/availability-windows/actions";
import type { AvailabilityWindow } from "@/features/availability-windows/queries";

function statusFor(w: AvailabilityWindow): { label: string; variant: "default" | "secondary" | "outline" } {
  const now = Date.now();
  if (now < new Date(w.opensAt).getTime()) return { label: "טרם נפתח", variant: "outline" };
  if (now > new Date(w.closesAt).getTime()) return { label: "נסגר", variant: "secondary" };
  return { label: "פתוח", variant: "default" };
}

export function AvailabilityWindowsList({ windows }: { windows: AvailabilityWindow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteAvailabilityWindow(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (windows.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין חלונות זמינות מוגדרים.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      <ul className="flex flex-col gap-3">
        {windows.map((w) => {
          const status = statusFor(w);
          return (
            <li key={w.id} className="rounded border p-3">
              {editingId === w.id ? (
                <AvailabilityWindowForm window={w} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{w.label}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground" dir="ltr">
                      {w.opensAt.slice(0, 16).replace("T", " ")} – {w.closesAt.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/availability-windows/${w.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      צפייה בתגובות
                    </Link>
                    <Link
                      href={`/admin/schedule/${w.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      שיבוץ
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(w.id)}>
                      עריכה
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(w.id)}>
                      מחיקה
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
