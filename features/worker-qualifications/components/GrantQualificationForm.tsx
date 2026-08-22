"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { grantQualification, type GrantQualificationState } from "../actions";
import type { Qualification } from "@/features/qualifications/queries";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function GrantQualificationForm({
  workerId,
  allQualifications,
  alreadyHeldQualificationIds,
}: {
  workerId: string;
  allQualifications: Qualification[];
  alreadyHeldQualificationIds: string[];
}) {
  const action = grantQualification.bind(null, workerId);
  const [state, formAction, pending] = useActionState<GrantQualificationState, FormData>(
    action,
    undefined,
  );

  const heldIds = new Set(alreadyHeldQualificationIds);
  const available = allQualifications.filter((q) => !heldIds.has(q.id));

  const [comboOpen, setComboOpen] = useState(false);
  const [qualificationId, setQualificationId] = useState<string | null>(null);
  const [optionId, setOptionId] = useState<string | null>(null);

  const selectedQualification = available.find((q) => q.id === qualificationId) ?? null;
  const needsOption = (selectedQualification?.options.length ?? 0) > 0;

  useEffect(() => {
    if (state?.success) {
      setQualificationId(null);
      setOptionId(null);
    }
  }, [state]);

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">לעובד/ת כבר יש את כל הכשירויות הקיימות.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>כשירות</Label>
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="w-64 justify-between font-normal text-muted-foreground"
              />
            }
          >
            {selectedQualification?.name ?? "בחירת כשירות..."}
            <ChevronsUpDown className="size-4 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <Command>
              <CommandInput placeholder="חיפוש כשירות..." />
              <CommandList>
                <CommandEmpty>לא נמצאו כשירויות</CommandEmpty>
                <CommandGroup>
                  {available.map((q) => (
                    <CommandItem
                      key={q.id}
                      value={q.name}
                      onSelect={() => {
                        setQualificationId(q.id);
                        setOptionId(null);
                        setComboOpen(false);
                      }}
                    >
                      {q.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input type="hidden" name="qualificationId" value={qualificationId ?? ""} />
      </div>

      {needsOption ? (
        <div className="flex flex-col gap-2">
          <Label>אפשרות</Label>
          <Select
            value={optionId ?? ""}
            onValueChange={(v) => setOptionId(v as string)}
            items={selectedQualification!.options.map((o) => ({ value: o.id, label: o.label }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחירת אפשרות" />
            </SelectTrigger>
            <SelectContent>
              {selectedQualification!.options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="optionId" value={optionId ?? ""} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="obtainedAt">תאריך קבלה</Label>
        <Input
          id="obtainedAt"
          name="obtainedAt"
          type="date"
          dir="ltr"
          defaultValue={todayIsoDate()}
          required
        />
      </div>

      {state && !state.success ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={pending || !qualificationId || (needsOption && !optionId)}>
          {pending ? "מעניק..." : "הענקת כשירות"}
        </Button>
      </div>
    </form>
  );
}
