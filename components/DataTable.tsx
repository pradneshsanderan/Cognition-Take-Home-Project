import Link from "next/link";
import type { Field } from "@/lib/defineApp";
import type { Row } from "@/lib/query";
import { FieldValue } from "@/components/FieldValue";

export function DataTable({
  slug,
  columns,
  rows,
}: {
  slug: string;
  columns: Field[];
  rows: Row[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No records match the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((field) => (
              <th key={field.name} className="px-4 py-3 font-medium">
                {field.label}
              </th>
            ))}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-b border-slate-100 last:border-0">
              {columns.map((field) => (
                <td key={field.name} className="px-4 py-3 align-top">
                  <FieldValue field={field} value={row[field.name]} />
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/${slug}/${String(row.id)}`}
                  className="text-sm font-medium text-sky-700 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
