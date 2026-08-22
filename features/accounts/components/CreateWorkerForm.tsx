"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWorkerAccount,
  type CreateWorkerState,
} from "@/features/accounts/actions";

export function CreateWorkerForm() {
  const [state, formAction, pending] = useActionState<CreateWorkerState, FormData>(
    createWorkerAccount,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">שם מלא</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">אימייל</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">סיסמה זמנית</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700">המשתמש נוצר בהצלחה</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "יוצר משתמש..." : "צור משתמש עובד"}
      </Button>
    </form>
  );
}