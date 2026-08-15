import { Prisma } from "@prisma/client";
import { appManifest } from "@/apps/_manifest";
import type { AppConfig, Field } from "@/lib/defineApp";
import { prisma } from "@/lib/prisma";

export type App = {
  slug: string;
  config: AppConfig;
};

const SCALAR_TYPES_BY_FIELD_TYPE: Record<Field["type"], string[]> = {
  string: ["String"],
  text: ["String"],
  money: ["Int", "BigInt", "Float", "Decimal"],
  number: ["Int", "BigInt", "Float", "Decimal"],
  boolean: ["Boolean"],
  enum: ["String"],
  datetime: ["DateTime"],
};

class AppConfigError extends Error {
  constructor(slug: string, message: string) {
    super(`apps/${slug}.ts: ${message}`);
    this.name = "AppConfigError";
  }
}

function modelForResource(slug: string, resource: string) {
  const model = Prisma.dmmf.datamodel.models.find(
    (candidate) => lowerFirst(candidate.name) === resource,
  );
  if (!model) {
    throw new AppConfigError(
      slug,
      `resource "${resource}" is not a Prisma client model. Known models: ${Prisma.dmmf.datamodel.models
        .map((candidate) => lowerFirst(candidate.name))
        .join(", ")}`,
    );
  }
  if (typeof (prisma as unknown as Record<string, unknown>)[resource] !== "object") {
    throw new AppConfigError(
      slug,
      `resource "${resource}" does not exist on the Prisma client`,
    );
  }
  return model;
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function validate(slug: string, config: AppConfig): AppConfig {
  const model = modelForResource(slug, config.resource);
  const modelFields = new Map(model.fields.map((field) => [field.name, field]));
  const configFields = new Map<string, Field>();

  for (const field of config.fields) {
    if (configFields.has(field.name)) {
      throw new AppConfigError(slug, `field "${field.name}" is declared twice`);
    }
    const modelField = modelFields.get(field.name);
    if (!modelField) {
      throw new AppConfigError(
        slug,
        `field "${field.name}" does not exist on Prisma model "${model.name}". Available fields: ${[
          ...modelFields.keys(),
        ].join(", ")}`,
      );
    }
    const allowed = SCALAR_TYPES_BY_FIELD_TYPE[field.type];
    if (!allowed.includes(String(modelField.type))) {
      throw new AppConfigError(
        slug,
        `field "${field.name}" is declared as "${field.type}" but Prisma model "${model.name}" declares it as "${modelField.type}"`,
      );
    }
    if (field.type === "enum" && (!field.options || field.options.length === 0)) {
      throw new AppConfigError(
        slug,
        `field "${field.name}" is of type "enum" and must declare options`,
      );
    }
    configFields.set(field.name, field);
  }

  const requireConfigField = (name: string, where: string) => {
    if (!configFields.has(name)) {
      throw new AppConfigError(
        slug,
        `${where} references "${name}", which is not a declared field. Declared fields: ${[
          ...configFields.keys(),
        ].join(", ")}`,
      );
    }
  };

  if (config.list.columns.length === 0) {
    throw new AppConfigError(slug, "list.columns must not be empty");
  }
  config.list.columns.forEach((name) => requireConfigField(name, "list.columns"));
  (config.list.filters ?? []).forEach((name) => requireConfigField(name, "list.filters"));
  if (config.list.defaultSort) {
    requireConfigField(config.list.defaultSort.field, "list.defaultSort.field");
  }
  if (config.list.pageSize !== undefined && config.list.pageSize < 1) {
    throw new AppConfigError(slug, "list.pageSize must be at least 1");
  }

  for (const action of config.actions ?? []) {
    const keys = Object.keys(action.effect.set);
    if (keys.length === 0) {
      throw new AppConfigError(
        slug,
        `action "${action.name}" must set at least one field`,
      );
    }
    keys.forEach((name) => requireConfigField(name, `action "${action.name}"`));
    for (const name of keys) {
      const field = configFields.get(name)!;
      const value = action.effect.set[name];
      if (field.type === "enum" && !field.options!.includes(String(value))) {
        throw new AppConfigError(
          slug,
          `action "${action.name}" sets "${name}" to "${value}", which is not one of its options: ${field.options!.join(", ")}`,
        );
      }
    }
  }

  return config;
}

let cache: App[] | undefined;

export function getApps(): App[] {
  if (!cache) {
    cache = Object.entries(appManifest)
      .map(([slug, config]) => ({ slug, config: validate(slug, config) }))
      .sort((a, b) => a.config.name.localeCompare(b.config.name));
  }
  return cache;
}

export function findApp(slug: string): App | undefined {
  return getApps().find((app) => app.slug === slug);
}

export function fieldsOf(config: AppConfig, names: string[]): Field[] {
  return names.map((name) => config.fields.find((field) => field.name === name)!);
}

export function pageSizeOf(config: AppConfig): number {
  return config.list.pageSize ?? 25;
}
