import { forbidden, notFound } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { Filters } from "@/components/Filters";
import { Pagination } from "@/components/Pagination";
import { fetchList } from "@/lib/query";
import { fieldsOf, findApp } from "@/lib/apps";
import { currentActor } from "@/lib/identity";
import { canView } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ListPage({ params, searchParams }: PageProps<"/[app]">) {
  const { app: slug } = await params;
  const app = findApp(slug);
  if (!app) notFound();
  if (!canView(await currentActor(), app.config)) forbidden();

  const query = await searchParams;
  const { config } = app;
  const { rows, total, page, pageCount, pageSize, filterValues } = await fetchList(
    config,
    query,
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{config.name}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">{total} records</p>

      <Filters
        slug={slug}
        fields={fieldsOf(config, config.list.filters ?? [])}
        values={filterValues}
      />
      <DataTable slug={slug} columns={fieldsOf(config, config.list.columns)} rows={rows} />
      <Pagination
        slug={slug}
        params={query}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
