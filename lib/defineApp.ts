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
  // When the record's named field exceeds value, the effect is not applied
  // directly: a pending approval is raised for a second permitted user.
  makerChecker?: { over?: { field: string; value: number } };
};

// "view" lists the roles that may see the app at all; every other key is an
// action name and lists the roles that may run it.
export type Permissions = {
  view: string[];
  [actionName: string]: string[];
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
  permissions: Permissions;
};

export function defineApp(config: AppConfig): AppConfig {
  return config;
}
