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
import { selfReportQualification, type SelfReportState } from "../actions";
import type { Qualification } from "@/features/qualifications/queries";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Same picker+option+date shape as GrantQualificationForm (the admin's version), but the
 * worker reports for themselves -- no workerId param, obtained date can't be in the future
 * (you can't have received a qualification you haven't gotten yet), and it lands as `pending`
 * instead of `approved`. */
export function SelfReportQualificationForm({
  allQualifications,
  alreadyHeldQualificationIds,
}: {
  allQualifications: Qualification[];
  alreadyHeldQualificationIds: string[];
}) {
  const [state, formAction, pending] = useActionState<SelfReportState, FormData>(
    selfReportQualification,
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
    return <p className="text-sm text-muted-foreground">כבר דיווחת על כל הכשירויות הקיימות.</p>;
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
          <Label>סוג</Label>
          <Select
            value={optionId ?? ""}
            onValueChange={(v) => setOptionId(v as string)}
            items={selectedQualification!.options.map((o) => ({ value: o.id, label: o.label }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחירת סוג" />
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
          max={todayIsoDate()}
          defaultValue={todayIsoDate()}
          required
        />
      </div>

      {state && !state.success ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={pending || !qualificationId || (needsOption && !optionId)}>
          {pending ? "מדווח..." : "דיווח כשירות"}
        </Button>
      </div>
    </form>
  );
}
