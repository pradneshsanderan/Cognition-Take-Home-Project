import { defineApp } from "@/lib/defineApp";

export default defineApp({
  name: "Example (Refunds)",
  resource: "refund",
  fields: [
    { name: "id", label: "ID", type: "string", readOnly: true },
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
    columns: ["customerName", "customerEmail", "amountPence", "status", "createdAt"],
    filters: ["status", "customerName"],
    defaultSort: { field: "createdAt", dir: "desc" },
    pageSize: 25,
  },
  actions: [
    {
      name: "approve",
      label: "Approve",
      effect: { set: { status: "approved" } },
      confirm: "Approve this refund?",
    },
    {
      name: "reject",
      label: "Reject",
      effect: { set: { status: "rejected" } },
      confirm: "Reject this refund?",
    },
  ],
});
