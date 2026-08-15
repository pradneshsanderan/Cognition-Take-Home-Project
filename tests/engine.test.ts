// Pure unit tests only: nothing here reads from or writes to the database.
//
// That is a consequence of the audit design, not an oversight. Every action goes
// through runAppAction() in lib/mutate.ts, which appends an AuditLog row in the
// same transaction as the change, and the audit log is append only — no code path
// updates or deletes a row, and eslint forbids adding one. An integration test
// that ran an action against the database backing this repo (a live demo
// database) would therefore permanently add rows to the /audit compliance view
// with no way to clean them up. So these tests exercise the engine's load-bearing
// pure logic — config validation, permission checks, filter translation — and the
// database-touching layers are exercised by using the app.

import { describe, expect, it } from "vitest";
import disputes from "@/apps/disputes";
import flags from "@/apps/flags";
import kyc from "@/apps/kyc";
import refunds from "@/apps/refunds";
import { validateAppConfig } from "@/lib/apps";
import type { AppConfig, Field } from "@/lib/defineApp";
import type { Actor } from "@/lib/identity";
import { canRunAction, canView, permittedActions } from "@/lib/permissions";
import { whereForFilter } from "@/lib/query";

function actor(...roles: string[]): Actor {
  return { id: "u1", email: "u1@example.com", name: "User One", roles };
}

/** A valid config against the Refund model, which each test then breaks in one way. */
function refundConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    name: "Refunds",
    resource: "refund",
    fields: [
      { name: "customerName", label: "Customer", type: "string" },
      { name: "amountPence", label: "Amount", type: "money" },
      {
        name: "status",
        label: "Status",
        type: "enum",
        options: ["pending", "approved", "rejected"],
      },
    ],
    list: { columns: ["customerName", "status"], filters: ["status"] },
    actions: [
      { name: "approve", label: "Approve", effect: { set: { status: "approved" } } },
    ],
    permissions: { view: ["support", "finance"], approve: ["finance"] },
    ...overrides,
  };
}

describe("validateAppConfig", () => {
  it("accepts a valid config", () => {
    expect(() => validateAppConfig("refunds", refundConfig())).not.toThrow();
  });

  it("rejects an unknown resource", () => {
    expect(() =>
      validateAppConfig("refunds", refundConfig({ resource: "invoice" })),
    ).toThrow(/resource "invoice" is not a Prisma client model/);
  });

  it("rejects an unknown field name", () => {
    const config = refundConfig();
    config.fields = [
      ...config.fields,
      { name: "currency", label: "Currency", type: "string" },
    ];
    expect(() => validateAppConfig("refunds", config)).toThrow(
      /field "currency" does not exist on Prisma model "Refund"/,
    );
  });

  it("rejects a FieldType that disagrees with the Prisma scalar", () => {
    const config = refundConfig();
    config.fields[1] = { name: "amountPence", label: "Amount", type: "datetime" };
    expect(() => validateAppConfig("refunds", config)).toThrow(
      /"amountPence" is declared as "datetime" but Prisma model "Refund" declares it as "Int"/,
    );
  });

  it("rejects an enum field with no options", () => {
    const config = refundConfig();
    config.fields[2] = { name: "status", label: "Status", type: "enum" };
    expect(() => validateAppConfig("refunds", config)).toThrow(
      /field "status" is of type "enum" and must declare options/,
    );
  });

  it("rejects an action setting an enum to a value outside its options", () => {
    const config = refundConfig({
      actions: [
        { name: "approve", label: "Approve", effect: { set: { status: "settled" } } },
      ],
    });
    expect(() => validateAppConfig("refunds", config)).toThrow(
      /action "approve" sets "status" to "settled", which is not one of its options: pending, approved, rejected/,
    );
  });
});

describe("canView", () => {
  it("is false for a user missing the role", () => {
    expect(canView(actor("engineering"), refundConfig())).toBe(false);
  });

  it("is true for a user holding the role", () => {
    expect(canView(actor("support"), refundConfig())).toBe(true);
  });
});

describe("canRunAction", () => {
  it("is false when the user may run the action but may not view the app", () => {
    const config = refundConfig({
      permissions: { view: ["finance"], approve: ["support"] },
    });
    expect(canRunAction(actor("support"), config, "approve")).toBe(false);
  });

  it("fails closed for an action absent from the permissions block", () => {
    const config = refundConfig({
      actions: [
        { name: "approve", label: "Approve", effect: { set: { status: "approved" } } },
        { name: "reject", label: "Reject", effect: { set: { status: "rejected" } } },
      ],
      permissions: { view: ["support", "finance"], approve: ["finance"] },
    });
    expect(canRunAction(actor("finance"), config, "reject")).toBe(false);
  });
});

describe("permittedActions", () => {
  const names = (config: AppConfig, roles: string[]) =>
    permittedActions(actor(...roles), config).map((action) => action.name);

  it("filters the seeded roles against the shipped configs", () => {
    // alice: finance + support, bob: support, carol: engineering, dave: compliance.
    expect(names(refunds, ["finance", "support"])).toEqual(["approve", "reject"]);
    expect(names(refunds, ["support"])).toEqual([]);
    expect(names(kyc, ["compliance"])).toEqual(["clear", "escalate"]);
    expect(names(kyc, ["support"])).toEqual([]);
    expect(names(flags, ["engineering"])).toEqual(["enable", "disable"]);
    expect(names(flags, ["compliance"])).toEqual([]);
    expect(names(disputes, ["finance"])).toEqual(["submitEvidence", "acceptLiability"]);
    // Compliance may view disputes but runs neither action.
    expect(canView(actor("compliance"), disputes)).toBe(true);
    expect(names(disputes, ["compliance"])).toEqual([]);
  });

  it("grants nothing to an unauthenticated actor", () => {
    expect(permittedActions(null, refunds)).toEqual([]);
  });
});

describe("whereForFilter", () => {
  const status: Field = {
    name: "status",
    label: "Status",
    type: "enum",
    options: ["pending", "approved", "rejected"],
  };

  it("translates a declared enum option into an equality condition", () => {
    expect(whereForFilter(status, "approved")).toEqual({ status: "approved" });
  });

  it("drops an enum value outside the declared options", () => {
    // This is the documented drift limitation, not desired behaviour: filtering
    // on a value the config does not declare silently becomes a no-op, so the
    // condition is omitted and the view returns every row instead of none.
    expect(whereForFilter(status, "settled")).toBeUndefined();
  });
});
