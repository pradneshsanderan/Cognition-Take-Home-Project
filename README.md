# Config-driven internal tools platform

An internal tool here is a config file, not a codebase: one generic set of routes and
components renders every app, so adding a tool means adding exactly one file under `apps/`.
Three worked examples ship with it — a refunds dashboard, a KYC review queue and a feature
flag console — each of which is a single file with fields, columns, filters, roles and
actions and no bespoke code. It was built to test whether a team could replace Microsoft
Power Apps with tooling they own.

## Running it

Prerequisites: Node 22 or newer (required — the app targets Next 16 and React 19), npm, and
a Postgres connection string.

Two environment variables. Put them in `.env` at the repository root:

```bash
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
```

`DATABASE_URL` is the pooled connection the app queries through; `DIRECT_URL` is a direct
(unpooled) connection Prisma uses for migrations. With a plain single-node Postgres, set
both to the same URL.

```bash
npm install
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma db seed          # idempotent: 4 users, 200 refunds, 120 KYC cases, 15 flags
npm run dev                 # http://localhost:3000
npm test                    # unit tests
npm run lint
npm run build
```

There is no login. Pick a user from the dropdown in the header — `alice` (finance,
support), `bob` (support), `carol` (engineering), `dave` (compliance) — and the nav, the
action buttons and `/audit` change with the roles.

### Deploying to Vercel

Set `DATABASE_URL` and `DIRECT_URL` in the project's environment variables. Leave the build
command as the repository's own `npm run build`, which runs `prisma generate` before
`next build` — without it the deployed bundle has no Prisma client. Set the project's Node
version to 22. Run `npx prisma migrate deploy` against the database once before the first
deploy.

## Adding a new app

Create `apps/<slug>.ts`. That is the only file that needs creating: the filename is the
route (`apps/refunds.ts` serves `/refunds`), and the `predev`/`prebuild` hooks run
`scripts/sync-apps.ts` to regenerate `apps/_manifest.ts`. A complete minimal config:

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

The model must already exist in `prisma/schema.prisma`. Every config is validated against
the Prisma datamodel on first use, so an unknown resource, an unknown field, a field type
that disagrees with the Prisma scalar or an action setting an impossible enum value throws
an error naming the offending file instead of rendering an empty table.
`apps/refunds.ts`, `apps/kyc.ts` and `apps/flags.ts` are the worked examples.

## Architecture

Next App Router with Prisma on Postgres. `lib/apps.ts` loads the generated manifest and
validates each config against the Prisma datamodel; `app/[app]/page.tsx` and
`app/[app]/[id]/page.tsx` are the only list and detail routes and render whatever the
config declares through generic components in `components/`. Reads go through
`lib/query.ts`, which builds `where`/`orderBy` from the config and the URL query string, so
views are shareable. Writes go through one choke point, `runAppAction()` in `lib/mutate.ts`,
reached only by `POST /api/[app]/[id]/[action]`: it resolves the actor, checks the
permission and appends the audit row in the same transaction as the change, so no route can
forget any of the three. An eslint rule rejects Prisma writes anywhere else.

In the engine: route and component rendering per field type, role checks derived from
`config.permissions`, the audited write path and the `/audit` view, formatting, filtering,
pagination, config validation, identity resolution.

In a config: fields and their types, list columns, which fields are filterable, sort order
and page size, the roles that may view, the actions and what they set, and the roles that
may run each one.

## What this deliberately does not do

**No real authentication.** A dev user switcher writes a `dev_user_email` cookie and
`currentActor()` in `lib/identity.ts` trusts it. Anyone can be anyone. Production replaces
that one function with an OIDC session lookup; nothing downstream of it — permissions,
audit, the choke point — knows where the identity came from, so nothing downstream changes.

**No maker-checker.** `Action.makerChecker` exists in the type in `lib/defineApp.ts` and is
validated (the field it names must exist and be numeric), but no code path reads it. There
is no dual-approval behaviour: an action with `makerChecker` declared applies immediately,
exactly like one without. It was scoped as a stretch goal and cut when session 2 ran long.

**Config and data can drift, and the engine hides it.** If a config declares an enum option
no row holds, filtering on it returns nothing. If a row holds a value the config does not
declare, that value is unreachable as a filter, and worse: `whereForFilter` in
`lib/query.ts` drops an out-of-options enum value entirely, so the condition disappears and
the view returns every row rather than none. Out-of-range enum filtering silently becomes a
no-op instead of surfacing the mismatch. Nothing checks that the options in a config match
the values in the table. This was found by exercising the app, not by reading it.

**No connectors, no workflows, no editing path.** There is no integration with any external
system, no scheduled or event-driven workflows, no mobile client, no way for a non-engineer
to create or change an app, and no multi-environment governance — no dev/staging/prod
promotion of a config, no approval on a config change, no per-environment app versions.

**The escape hatch problem.** Some app will need something a config cannot express — a
chart, a multi-step form, a bulk edit, a screen that joins two resources — and the engine
has no route into custom React for one screen. The choices are to widen the config format
until it is a programming language, or to drop out of the platform and write the tool by
hand. Every low-code platform has this cliff; owning the engine only means you choose where
it sits.

## Tests

`npm test` runs Vitest. The tests are pure unit tests over the load-bearing logic — config
validation, `canView`/`canRunAction`/`permittedActions`, and `whereForFilter` — and touch
no database. That is forced by the audit design: actions are audited in the same
transaction as the change and the log is append only, so an integration test running an
action would permanently add rows to the `/audit` compliance view.
