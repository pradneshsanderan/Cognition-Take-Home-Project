import Link from "next/link";
import { currentActor } from "@/lib/identity";
import { visibleApps } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const actor = await currentActor();
  const apps = visibleApps(actor);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Internal tools</h1>
      <p className="mt-1 text-sm text-slate-500">
        {apps.length} app{apps.length === 1 ? "" : "s"} visible to{" "}
        {actor ? `${actor.name} (${actor.roles.join(", ") || "no roles"})` : "no user"}
      </p>

      {apps.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {actor
            ? "No apps grant a view permission to this user's roles."
            : "Pick a user in the header to see the apps their roles may view."}
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
