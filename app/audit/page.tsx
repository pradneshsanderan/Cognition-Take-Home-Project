import Link from "next/link";
import { forbidden } from "next/navigation";
import { getApps } from "@/lib/apps";
import { formatDateTime } from "@/lib/format";
import { currentActor, listUsers } from "@/lib/identity";
import { canViewAudit } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : (value ?? "")).trim();
}

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  if (!canViewAudit(await currentActor())) forbidden();

  const query = await searchParams;
  const app = single(query.app);
  const actorId = single(query.actor);

  const [users, entries] = await Promise.all([
    listUsers(),
    // Read only: the log is append only, written by lib/mutate.ts.
    prisma.auditLog.findMany({
      where: {
        ...(app ? { app } : {}),
        ...(actorId ? { actorId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
  ]);

  const hasFilter = app !== "" || actorId !== "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Newest first, up to {PAGE_SIZE} entries. Append only.
      </p>

      <form
        // Keyed on the active filters so React remounts the uncontrolled
        // selects instead of keeping stale ones across a soft navigation.
        key={`app=${app}&actor=${actorId}`}
        method="get"
        action="/audit"
        className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="flex w-48 flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            App
          </span>
          <select
            name="app"
            defaultValue={app}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="">All</option>
            {getApps().map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.config.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-56 flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Actor
          </span>
          <select
            name="actor"
            defaultValue={actorId}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="">All</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Apply
          </button>
          {hasFilter ? (
            <Link href="/audit" className="text-sm text-slate-500 hover:underline">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No audit entries match the current filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Record</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Before → After</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-top">{entry.actorEmail}</td>
                  <td className="px-4 py-3 align-top">{entry.app}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs">
                    {entry.resource}/{entry.recordId}
                  </td>
                  <td className="px-4 py-3 align-top">{entry.action}</td>
                  <td className="px-4 py-3 align-top">{entry.outcome}</td>
                  <td className="px-4 py-3 align-top">
                    <pre className="max-w-md overflow-x-auto text-xs text-slate-500">
                      {JSON.stringify(entry.before)}
                      {"\n→ "}
                      {JSON.stringify(entry.after)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
