"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setWorkerPairingPreference, type PairingState } from "../actions";
import type { Profile } from "@/lib/auth";

/** Plain native <select> deliberately, not the searchable-combobox pattern used elsewhere --
 * a squadron-sized roster doesn't need search, and native selects sidestep the "needs a hidden
 * input to submit via FormData" class of bugs already hit twice this project with Base UI's
 * Select and Button primitives. */
export function WorkerPairingPreferencesForm({ allWorkers }: { allWorkers: Profile[] }) {
  const [state, formAction, pending] = useActionState<PairingState, FormData>(
    setWorkerPairingPreference,
    undefined,
  );

  if (allWorkers.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        צריך לפחות שני עובדים כדי להגדיר העדפת שיבוץ.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="workerA">עובד/ת 1</Label>
        <select
          id="workerA"
          name="workerA"
          required
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {allWorkers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="workerB">עובד/ת 2</Label>
        <select
          id="workerB"
          name="workerB"
          required
          defaultValue={allWorkers[1]?.id}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {allWorkers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="preference">העדפה</Label>
        <select
          id="preference"
          name="preference"
          required
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="avoid">הימנעות</option>
          <option value="prefer_avoid">העדפה להימנע</option>
          <option value="prefer">העדפה</option>
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        שמירה
      </Button>
      {state && !state.success ? (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
