import { defineApp } from "@/lib/defineApp";

export default defineApp({
  name: "Chargeback Disputes",
  resource: "dispute",
  fields: [
    { name: "merchantName", label: "Merchant", type: "string" },
    {
      name: "cardNetwork",
      label: "Network",
      type: "enum",
      options: ["visa", "mastercard", "amex", "discover"],
    },
    { name: "amountPence", label: "Amount", type: "money" },
    { name: "reasonCode", label: "Reason code", type: "string" },
    {
      name: "status",
      label: "Status",
      type: "enum",
      options: ["open", "evidence_submitted", "won", "lost"],
    },
    { name: "openedAt", label: "Opened", type: "datetime", readOnly: true },
  ],
  list: {
    columns: [
      "merchantName",
      "cardNetwork",
      "amountPence",
      "reasonCode",
      "status",
      "openedAt",
    ],
    filters: ["status", "cardNetwork"],
    defaultSort: { field: "openedAt", dir: "asc" },
    pageSize: 25,
  },
  permissions: {
    view: ["finance", "compliance"],
    submitEvidence: ["finance"],
    acceptLiability: ["finance"],
  },
  actions: [
    {
      name: "submitEvidence",
      label: "Submit evidence",
      effect: { set: { status: "evidence_submitted" } },
    },
    {
      name: "acceptLiability",
      label: "Accept liability",
      effect: { set: { status: "lost" } },
      confirm: "Accept liability for this dispute? It will be recorded as lost.",
    },
  ],
});
