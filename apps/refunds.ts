import { defineApp } from "@/lib/defineApp";

export default defineApp({
  name: "Refunds Dashboard",
  resource: "refund",
  fields: [
    { name: "customerName", label: "Customer", type: "string" },
    { name: "customerEmail", label: "Email", type: "string" },
    { name: "amountPence", label: "Amount", type: "money" },
    { name: "reason", label: "Reason", type: "text" },
    {
      name: "status",
      label: "Status",
      type: "enum",
      options: ["pending", "approved", "rejected"],
    },
    { name: "createdAt", label: "Created", type: "datetime", readOnly: true },
  ],
  list: {
    columns: ["customerName", "amountPence", "status", "createdAt"],
    filters: ["status"],
    defaultSort: { field: "createdAt", dir: "desc" },
    pageSize: 25,
  },
  permissions: {
    view: ["support", "finance"],
    approve: ["finance"],
    reject: ["finance"],
  },
  actions: [
    {
      name: "approve",
      label: "Approve refund",
      effect: { set: { status: "approved" } },
    },
    {
      name: "reject",
      label: "Reject",
      effect: { set: { status: "rejected" } },
      confirm: "Reject this refund?",
    },
  ],
});
