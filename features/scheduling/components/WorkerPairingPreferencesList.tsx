"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteWorkerPairingPreference } from "../actions";
import type { WorkerPairing, PairingPreference } from "../queries";

const PREFERENCE_LABEL: Record<PairingPreference, string> = {
  avoid: "הימנעות",
  prefer_avoid: "העדפה להימנע",
  prefer: "העדפה",
};

const PREFERENCE_VARIANT: Record<PairingPreference, "destructive" | "outline" | "default"> = {
  avoid: "destructive",
  prefer_avoid: "outline",
  prefer: "default",
};

export function WorkerPairingPreferencesList({ pairings }: { pairings: WorkerPairing[] }) {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await deleteWorkerPairingPreference(id);
    if (!result.success) setDeleteError(result.error);
  }

  if (pairings.length === 0) {
    return <p className="text-sm text-muted-foreground">אין העדפות שיבוץ מוגדרות.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      <ul className="flex flex-col gap-2">
        {pairings.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
          >
            <span>
              {p.workerName1} × {p.workerName2}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={PREFERENCE_VARIANT[p.preference]}>
                {PREFERENCE_LABEL[p.preference]}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}>
                מחיקה
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
