"use client";

import type { Action } from "@/lib/defineApp";

export function RecordActions({
  slug,
  id,
  actions,
}: {
  slug: string;
  id: string;
  actions: Action[];
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        // Plain form posts: every action goes through the endpoint, which
        // re-checks the permission server side and audits the attempt.
        <form
          key={action.name}
          method="post"
          action={`/api/${slug}/${id}/${action.name}`}
          onSubmit={(event) => {
            if (action.confirm && !window.confirm(action.confirm)) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {action.label}
          </button>
        </form>
      ))}
    </div>
  );
}
