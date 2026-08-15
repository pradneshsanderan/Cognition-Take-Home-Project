import type { AppConfig } from "@/lib/defineApp";
import type { Row } from "@/lib/query";
import { FieldValue } from "@/components/FieldValue";

export function RecordDetail({ config, row }: { config: AppConfig; row: Row }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {config.fields.map((field) => (
        <div key={field.name} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
          <dt className="font-medium text-slate-500">{field.label}</dt>
          <dd className="col-span-2 whitespace-pre-wrap">
            <FieldValue field={field} value={row[field.name]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
