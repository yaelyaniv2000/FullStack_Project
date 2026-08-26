"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateExpiringSoonDays, type AppSettingsState } from "../actions";

export function ExpiringSoonDaysForm({ expiringSoonDays }: { expiringSoonDays: number }) {
  const [state, formAction, pending] = useActionState<AppSettingsState, FormData>(
    updateExpiringSoonDays,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="expiringSoonDays">ימים לפני פקיעת כשירות שנחשבים &quot;בקרוב&quot;</Label>
        <Input
          id="expiringSoonDays"
          name="expiringSoonDays"
          type="number"
          min={1}
          defaultValue={expiringSoonDays}
          className="w-24"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        שמירה
      </Button>
      {state && !state.success ? (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
