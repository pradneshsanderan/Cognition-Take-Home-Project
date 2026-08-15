---
name: testing-config-driven-tools
description: How to run and browser-test the config-driven internal tools app (Next.js App Router + Prisma + hosted Supabase) in this repo, including the generic /[app] and /[app]/[id] routes, filters/pagination URL state, and declarative action buttons.
---

# Testing the config-driven internal tools UI

## Running it
- Use Node 22: `source ~/.nvm/nvm.sh && nvm use 22` (default Node 20.x only emits engine warnings, but prefer 22).
- `npm install` then `npm run dev` (port 3000). The `predev` hook regenerates `apps/_manifest.ts` from the
  `apps/<slug>.ts` config files — if a new app config doesn't appear at `/`, restart dev (or run `npm run sync-apps`).
- Database is a **hosted** Supabase Postgres via `$DATABASE_URL` (pooler) / `$DIRECT_URL`. Never start a local Postgres.
  Seeding (`npx prisma db seed`) is idempotent.
- Start dev in the background and tee logs, e.g. `npm run dev > /tmp/dev.log 2>&1 &`, then
  `grep -nE "Error|500" /tmp/dev.log` at the end of the run — the Next dev log prints one line per request
  (including `runAction(...)` server-action invocations), which is the easiest 500/no-500 evidence.

## Routes / structure worth knowing
- Only generic routes exist: `/` (app discovery), `/[app]` (list + filters + pagination), `/[app]/[id]` (detail + actions).
- An "app" is one file `apps/<slug>.ts` exporting `defineApp({...})`; the filename is the route slug.
  Committed example: `apps/__example.ts` → `/__example` ("Example (Refunds)"), pageSize 25.
- Filters are a plain GET form (`components/Filters.tsx`), so filter state lives entirely in the query string —
  test back/forward and deep links by URL, not by client state.
- `lib/query.ts` clamps `page` into `[1, pageCount]` and silently drops filter values that aren't valid enum options,
  so `page=0|999|abc` and `status=<junk>` are expected to render a normal page, never a 500.
- Action buttons (`components/RecordActions.tsx`) use native `window.confirm`. With computer-use, click the button
  then click OK/Cancel in the browser's native dialog; the page won't respond to other clicks while it's open.

## Known/likely issues to check
- **Stale filter control after "Clear"** (fixed in commit 61a8cbb by giving the `<form>` a `key` derived from the
  active filter values so React remounts the uncontrolled controls): historically, clicking Clear navigated to
  `/<app>` and the data reset, but the Status `<select>` kept showing the previous value. If a future change touches
  `components/Filters.tsx`, re-test it this way: apply a filter, click Clear, and check BOTH that the control
  visibly reads "All"/empty AND that pressing Apply immediately afterwards submits an empty value (URL
  `?status=&customerName=`) with the unfiltered count — checking only the control, or only the count, would pass
  even if the bug were back.
- **Browser form-state restoration can look like the same bug.** Pressing Back to a page whose form the user
  edited before navigating away makes Chrome restore those typed/selected values, so the controls can disagree
  with the URL and row count. Discriminate before reporting it as an app bug: a hard reload of the same URL, and a
  Back into a page whose form was never edited, should both render controls that match the URL.
- Pagination links preserve unknown/invalid query params (e.g. `?status=not-an-option&page=2`). Harmless but worth noting.

## Computer-use gotcha
- Chrome's omnibox inline autocomplete will silently expand a typed URL into a longer previously-visited URL
  (e.g. typing `localhost:3000/__example` after visiting a 300-char `?customerName=zzz…` URL navigates to the long
  one). The page then looks "frozen" because it never changed. Press `Delete` after typing the URL to drop the
  inline completion, or navigate by clicking in-app links instead.

## Devin Secrets Needed
- `DATABASE_URL`, `DIRECT_URL` (hosted Supabase Postgres) — already present in the session env.
