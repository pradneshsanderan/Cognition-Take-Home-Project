import Link from "next/link";
import type { Field } from "@/lib/defineApp";

const CONTROL_CLASSES =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none";

function Control({ field, value }: { field: Field; value: string }) {
  if (field.type === "enum") {
    return (
      <select name={field.name} defaultValue={value} className={CONTROL_CLASSES}>
        <option value="">All</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    return (
      <select name={field.name} defaultValue={value} className={CONTROL_CLASSES}>
        <option value="">Any</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  const numeric = field.type === "money" || field.type === "number";
  return (
    <input
      name={field.name}
      defaultValue={value}
      type="text"
      inputMode={numeric ? "numeric" : undefined}
      placeholder={
        field.type === "datetime"
          ? "YYYY-MM-DD"
          : numeric
            ? field.type === "money"
              ? "amount in pence"
              : "exact value"
            : "contains…"
      }
      className={CONTROL_CLASSES}
    />
  );
}

export function Filters({
  slug,
  fields,
  values,
}: {
  slug: string;
  fields: Field[];
  values: Record<string, string>;
}) {
  if (fields.length === 0) return null;

  const hasActiveFilter = fields.some((field) => values[field.name] !== "");

  return (
    <form
      action={`/${slug}`}
      method="get"
      className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      {fields.map((field) => (
        <label key={field.name} className="flex w-48 flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {field.label}
          </span>
          <Control field={field} value={values[field.name] ?? ""} />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Apply
        </button>
        {hasActiveFilter ? (
          <Link href={`/${slug}`} className="text-sm text-slate-500 hover:underline">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
