import type { Field } from "@/lib/defineApp";
import { formatValue } from "@/lib/format";

const PILL_CLASSES = [
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-slate-200 text-slate-800",
];

function pillClass(field: Field, value: string): string {
  const index = (field.options ?? []).indexOf(value);
  return PILL_CLASSES[index < 0 ? PILL_CLASSES.length - 1 : index % PILL_CLASSES.length];
}

export function FieldValue({ field, value }: { field: Field; value: unknown }) {
  const formatted = formatValue(field, value);

  if (field.type === "enum") {
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pillClass(
          field,
          String(value),
        )}`}
      >
        {formatted}
      </span>
    );
  }

  if (field.type === "boolean") {
    return (
      <span className={value ? "text-emerald-600" : "text-rose-600"}>{formatted}</span>
    );
  }

  const numeric = field.type === "money" || field.type === "number";
  return (
    <span className={numeric ? "tabular-nums" : undefined}>{formatted}</span>
  );
}
