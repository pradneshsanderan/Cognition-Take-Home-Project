"use client";

import { useTransition } from "react";
import type { Action } from "@/lib/defineApp";
import { runAction } from "@/app/[app]/[id]/actions";

export function RecordActions({
  slug,
  id,
  actions,
}: {
  slug: string;
  id: string;
  actions: Action[];
}) {
  const [pending, startTransition] = useTransition();

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          disabled={pending}
          onClick={() => {
            if (action.confirm && !window.confirm(action.confirm)) return;
            startTransition(() => {
              void runAction(slug, id, action.name);
            });
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
