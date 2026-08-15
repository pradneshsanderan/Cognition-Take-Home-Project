# Config-driven internal tools platform

An internal tool here is a config file, not a codebase. One generic set of routes and
components renders every app: adding a tool means adding exactly one file under `apps/`.

## Getting started

```bash
npm install
npx prisma migrate dev
npx prisma db seed      # idempotent
npm run dev
```

`DATABASE_URL` (Supabase transaction pooler, port 6543) and `DIRECT_URL` (session pooler,
port 5432) must be present in the environment. See `.env.example` for the shape; never
commit real values.

## Adding an app

Create `apps/<slug>.ts` default-exporting `defineApp({...})`. The filename is the route:
`apps/refunds.ts` serves `/refunds`. Nothing else needs to change — the `predev` and
`prebuild` hooks run `scripts/sync-apps.ts`, which regenerates `apps/_manifest.ts` with a
static import per app file (static imports, not a runtime `readdirSync`, so the files are
traced into the Vercel serverless bundle).

```ts
import { defineApp } from "@/lib/defineApp";

export default defineApp({
  name: "Refunds Dashboard",
  resource: "refund", // Prisma client model key
  fields: [
    { name: "customerName", label: "Customer", type: "string" },
    { name: "amountPence", label: "Amount", type: "money" },
    { name: "status", label: "Status", type: "enum", options: ["pending", "approved"] },
    { name: "createdAt", label: "Created", type: "datetime", readOnly: true },
  ],
  list: {
    columns: ["customerName", "amountPence", "status", "createdAt"],
    filters: ["status", "customerName"],
    defaultSort: { field: "createdAt", dir: "desc" },
    pageSize: 25,
  },
  actions: [{ name: "approve", label: "Approve", effect: { set: { status: "approved" } } }],
});
```

Every config is validated against the Prisma datamodel on first use: an unknown
`resource`, an unknown field name, a field/column/filter type mismatch or an action that
sets an impossible enum value throws an error naming the offending `apps/<slug>.ts` file
instead of rendering an empty table.

## Layout

| Path | Purpose |
| --- | --- |
| `lib/defineApp.ts` | `AppConfig` types and the `defineApp()` identity function |
| `lib/registry.ts` | manifest loading plus config validation against the Prisma datamodel |
| `lib/query.ts` | generic list/detail/update queries via `prisma[config.resource]` |
| `lib/format.ts` | field-type formatting (money in pence → GBP, datetimes, booleans) |
| `components/` | generic table, filters, pagination, detail and action components |
| `app/[app]`, `app/[app]/[id]` | list and detail routes for every app |
| `scripts/sync-apps.ts` | generates `apps/_manifest.ts` |

Filter values and the page number live in the URL query string, so views are shareable and
browser back/forward work.
