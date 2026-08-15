import Link from "next/link";
import { getApps } from "@/lib/registry";

export const runtime = "nodejs";

export default function HomePage() {
  const apps = getApps();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Internal tools</h1>
      <p className="mt-1 text-sm text-slate-500">
        {apps.length} app{apps.length === 1 ? "" : "s"} discovered from apps/
      </p>

      {apps.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No apps yet. Add a config file under apps/ to create one.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <li key={app.slug}>
              <Link
                href={`/${app.slug}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400"
              >
                <span className="text-base font-medium">{app.config.name}</span>
                <span className="mt-1 block text-sm text-slate-500">
                  /{app.slug} · {app.config.resource}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
