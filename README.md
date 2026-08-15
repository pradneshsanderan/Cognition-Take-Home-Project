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
  permissions: { view: ["support", "finance"], approve: ["finance"] },
});
```

Every config is validated against the Prisma datamodel on first use: an unknown
`resource`, an unknown field name, a field/column/filter type mismatch or an action that
sets an impossible enum value throws an error naming the offending `apps/<slug>.ts` file
instead of rendering an empty table. `permissions.view` is required, and granting a
permission for an action the config does not declare is an error too.

## Access control

`permissions.view` lists the roles that may see the app at all; every other key names an
action and lists the roles that may run it. Roles come from the `User` row of the current
user (`finance`, `support`, `engineering`, `compliance` are seeded).

An app the current user may not view is absent from the home page and the header nav, and
requesting its route directly returns a real `403` (`forbidden()` → `app/forbidden.tsx`),
not a redirect. Action buttons render only for permitted roles — a courtesy, since the
server re-checks on every request.

All writes go through one choke point, `runAppAction()` in `lib/mutate.ts`. It resolves the
identity, checks the permission and appends the audit entry in the same transaction as the
change, so a route cannot forget any of the three: `lib/query.ts` exposes no write path at
all, and eslint rejects `prisma.<model>.update|create|delete` outside `lib/mutate.ts`.
`POST /api/[app]/[id]/[action]` is the only mutation route; it maps the choke point's
result to `403`, `404` or `400` and otherwise redirects back to the record.

### Dev identity

There is no login. The header dropdown names one of the seeded users in the
`dev_user_email` cookie, and `currentActor()` in `lib/identity.ts` — the single point where
identity is resolved — loads that `User` row. In production only that function changes (an
OIDC provider's verified session instead of a cookie); nothing downstream of it changes.

### Audit log

Every attempt to run an action appends an `AuditLog` row: actor, app, resource, record,
action, outcome (`applied` or `denied`) and the before/after record. It is append only —
nothing in the codebase updates or deletes a row, and an eslint rule rejects any update or
delete call on the `auditLog` model anywhere. `/audit` renders the log newest first,
filterable by app and actor, and is visible only to the `compliance` role.

## Layout

| Path | Purpose |
| --- | --- |
| `lib/defineApp.ts` | `AppConfig` types and the `defineApp()` identity function |
| `lib/apps.ts` | manifest loading plus config validation against the Prisma datamodel |
| `lib/query.ts` | generic list/detail read queries via `prisma[config.resource]` |
| `lib/mutate.ts` | the single choke point: permission check + audited write in one transaction |
| `lib/identity.ts` | dev identity resolution (cookie today, OIDC in production) |
| `lib/permissions.ts` | role checks derived from `config.permissions` |
| `lib/format.ts` | field-type formatting (money in pence → GBP, datetimes, booleans) |
| `components/` | generic table, filters, pagination, detail and action components |
| `app/[app]`, `app/[app]/[id]` | list and detail routes for every app |
| `app/api/[app]/[id]/[action]` | the only mutation route |
| `app/audit` | read-only audit log, `compliance` only |
| `scripts/sync-apps.ts` | generates `apps/_manifest.ts` |

Filter values and the page number live in the URL query string, so views are shareable and
browser back/forward work.
