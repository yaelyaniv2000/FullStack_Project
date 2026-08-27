"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/lib/auth";

export function WorkersList({ workers }: { workers: Profile[] }) {
  const [query, setQuery] = useState("");

  if (workers.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין עובדים רשומים.</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? workers.filter((w) => w.full_name.toLowerCase().includes(normalizedQuery))
    : workers;

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="חיפוש עובד/ת..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">לא נמצאו עובדים תואמים.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((worker) => (
            <li key={worker.id} className="text-sm">
              <Link href={`/admin/personnel/${worker.id}`} className="hover:underline">
                {worker.full_name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
