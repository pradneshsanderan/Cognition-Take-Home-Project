// Read side only. Writes live behind the single choke point in lib/mutate.ts.
import type { AppConfig, Field } from "@/lib/defineApp";
import { pageSizeOf } from "@/lib/apps";
import { prisma } from "@/lib/prisma";

export type Row = Record<string, unknown>;

export type SearchParams = Record<string, string | string[] | undefined>;

export type ListResult = {
  rows: Row[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  filterValues: Record<string, string>;
};

function single(params: SearchParams, key: string): string {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

export function whereForFilter(field: Field, raw: string): Row | undefined {
  if (raw === "") return undefined;
  switch (field.type) {
    case "boolean":
      if (raw !== "true" && raw !== "false") return undefined;
      return { [field.name]: raw === "true" };
    case "enum":
      if (!field.options!.includes(raw)) return undefined;
      return { [field.name]: raw };
    case "number":
    case "money": {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return undefined;
      return { [field.name]: parsed };
    }
    case "datetime": {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return undefined;
      return { [field.name]: parsed };
    }
    default:
      return { [field.name]: { contains: raw, mode: "insensitive" } };
  }
}

function delegate(resource: string) {
  const client = prisma as unknown as Record<
    string,
    {
      findMany: (args: unknown) => Promise<Row[]>;
      count: (args: unknown) => Promise<number>;
      findUnique: (args: unknown) => Promise<Row | null>;
    }
  >;
  return client[resource];
}

export async function fetchList(
  config: AppConfig,
  params: SearchParams,
): Promise<ListResult> {
  const pageSize = pageSizeOf(config);
  const filterValues: Record<string, string> = {};
  const conditions: Row[] = [];

  for (const name of config.list.filters ?? []) {
    const field = config.fields.find((candidate) => candidate.name === name)!;
    const raw = single(params, name);
    filterValues[name] = raw;
    const condition = whereForFilter(field, raw);
    if (condition) conditions.push(condition);
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};
  const orderBy = config.list.defaultSort
    ? { [config.list.defaultSort.field]: config.list.defaultSort.dir }
    : undefined;

  const model = delegate(config.resource);
  const total = await model.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number.parseInt(single(params, "page"), 10);
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    pageCount,
  );

  const rows = await model.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return { rows, total, page, pageCount, pageSize, filterValues };
}

export function fetchRecord(config: AppConfig, id: string): Promise<Row | null> {
  return delegate(config.resource).findUnique({ where: { id } });
}
