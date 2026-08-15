import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordActions } from "@/components/RecordActions";
import { RecordDetail } from "@/components/RecordDetail";
import { fetchRecord } from "@/lib/query";
import { findApp } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DetailPage({ params }: PageProps<"/[app]/[id]">) {
  const { app: slug, id } = await params;
  const app = findApp(slug);
  if (!app) notFound();

  const row = await fetchRecord(app.config, id);
  if (!row) notFound();

  return (
    <div>
      <Link href={`/${slug}`} className="text-sm text-sky-700 hover:underline">
        ← Back to {app.config.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{app.config.name}</h1>
      <p className="mt-1 mb-6 font-mono text-sm text-slate-500">{id}</p>

      <RecordDetail config={app.config} row={row} />

      <div className="mt-6">
        <RecordActions slug={slug} id={id} actions={app.config.actions ?? []} />
      </div>
    </div>
  );
}
