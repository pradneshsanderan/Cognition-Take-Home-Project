import { defineApp } from "@/lib/defineApp";

export default defineApp({
  name: "Feature Flags",
  resource: "featureFlag",
  fields: [
    { name: "key", label: "Key", type: "string" },
    { name: "description", label: "Description", type: "text" },
    {
      name: "environment",
      label: "Environment",
      type: "enum",
      options: ["dev", "staging", "prod"],
    },
    { name: "enabled", label: "Enabled", type: "boolean" },
    { name: "rollout", label: "Rollout %", type: "number" },
    { name: "updatedAt", label: "Updated", type: "datetime", readOnly: true },
  ],
  list: {
    columns: ["key", "environment", "enabled", "rollout", "updatedAt"],
    filters: ["environment", "enabled"],
    defaultSort: { field: "key", dir: "asc" },
    pageSize: 25,
  },
  permissions: {
    view: ["engineering"],
    enable: ["engineering"],
    disable: ["engineering"],
  },
  actions: [
    {
      name: "enable",
      label: "Enable",
      effect: { set: { enabled: true } },
    },
    {
      name: "disable",
      label: "Disable",
      effect: { set: { enabled: false } },
    },
  ],
});
