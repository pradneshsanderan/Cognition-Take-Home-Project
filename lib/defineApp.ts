export type FieldType =
  | "string"
  | "text"
  | "money"
  | "number"
  | "boolean"
  | "enum"
  | "datetime";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  readOnly?: boolean;
};

export type Action = {
  name: string;
  label: string;
  effect: { set: Record<string, string | number | boolean> };
  confirm?: string;
};

export type AppConfig = {
  name: string;
  resource: string;
  fields: Field[];
  list: {
    columns: string[];
    filters?: string[];
    defaultSort?: { field: string; dir: "asc" | "desc" };
    pageSize?: number;
  };
  actions?: Action[];
};

export function defineApp(config: AppConfig): AppConfig {
  return config;
}
