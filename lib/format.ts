import type { Field } from "@/lib/defineApp";

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(value: Date): string {
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(
    value.getUTCDate(),
  )} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
}

export function formatValue(field: Field, value: unknown): string {
  if (value === null || value === undefined) return "—";
  switch (field.type) {
    case "money":
      return GBP.format(Number(value) / 100);
    case "number":
      return new Intl.NumberFormat("en-GB").format(Number(value));
    case "datetime":
      return formatDateTime(new Date(value as string | number | Date));
    case "boolean":
      return value ? "✓" : "✗";
    default:
      return String(value);
  }
}
