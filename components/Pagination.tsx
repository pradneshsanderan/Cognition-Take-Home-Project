import Link from "next/link";
import type { SearchParams } from "@/lib/query";

function hrefFor(slug: string, params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) query.set(key, raw);
  }
  query.set("page", String(page));
  return `/${slug}?${query.toString()}`;
}

export function Pagination({
  slug,
  params,
  page,
  pageCount,
  pageSize,
  total,
}: {
  slug: string;
  params: SearchParams;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <p>
        {total === 0
          ? "0 records"
          : `Showing ${first}–${last} of ${total} records · page ${page} of ${pageCount}`}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(slug, params, page - 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-100"
          >
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link
            href={hrefFor(slug, params, page + 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-100"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
