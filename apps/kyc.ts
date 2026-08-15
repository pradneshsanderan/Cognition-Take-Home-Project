import { defineApp } from "@/lib/defineApp";

export default defineApp({
  name: "KYC Review Queue",
  resource: "kycCase",
  fields: [
    { name: "applicantName", label: "Applicant", type: "string" },
    { name: "country", label: "Country", type: "string" },
    {
      name: "riskLevel",
      label: "Risk",
      type: "enum",
      options: ["low", "medium", "high"],
    },
    { name: "documentType", label: "Document", type: "string" },
    {
      name: "status",
      label: "Status",
      type: "enum",
      options: ["pending", "cleared", "escalated"],
    },
    { name: "submittedAt", label: "Submitted", type: "datetime", readOnly: true },
  ],
  list: {
    columns: ["applicantName", "country", "riskLevel", "documentType", "status"],
    filters: ["status", "riskLevel", "country"],
    defaultSort: { field: "submittedAt", dir: "asc" },
    pageSize: 25,
  },
  permissions: {
    view: ["compliance", "support"],
    clear: ["compliance"],
    escalate: ["compliance"],
  },
  actions: [
    {
      name: "clear",
      label: "Clear",
      effect: { set: { status: "cleared" } },
    },
    {
      name: "escalate",
      label: "Escalate",
      effect: { set: { status: "escalated" } },
    },
  ],
});
