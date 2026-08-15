import type { Prisma } from "@prisma/client";
import { findApp } from "@/lib/apps";
import type { Action, AppConfig } from "@/lib/defineApp";
import { currentActor, type Actor } from "@/lib/identity";
import { canRunAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { Row } from "@/lib/query";

/**
 * The single choke point for every mutation in the platform.
 *
 * `lib/query.ts` reads; nothing else anywhere may write to an app resource,
 * because this module is the only place that reaches for a write delegate and it
 * never exports one. A route cannot "forget" to check a permission or to audit:
 * resolving the identity, checking the permission and appending the audit entry
 * all happen here, before and inside the same transaction as the change itself.
 */

export type MutationResult =
  | { ok: true; outcome: "applied"; row: Row }
  | { ok: false; status: 400 | 403 | 404; message: string };

type WriteDelegate = {
  findUnique: (args: unknown) => Promise<Row | null>;
  update: (args: unknown) => Promise<Row>;
};

type Tx = Prisma.TransactionClient;

function writeDelegate(tx: Tx, resource: string): WriteDelegate {
  return (tx as unknown as Record<string, WriteDelegate>)[resource];
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

type AuditInput = {
  actor: Actor;
  config: AppConfig;
  slug: string;
  recordId: string;
  action: string;
  outcome: string;
  before: unknown;
  after: unknown;
};

function auditData(input: AuditInput): Prisma.AuditLogCreateInput {
  return {
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    app: input.slug,
    resource: input.config.resource,
    recordId: input.recordId,
    action: input.action,
    outcome: input.outcome,
    before: toJson(input.before),
    after: toJson(input.after),
  };
}

export async function runAppAction(input: {
  slug: string;
  id: string;
  action: string;
}): Promise<MutationResult> {
  const slug = input.slug?.trim();
  const id = input.id?.trim();
  const actionName = input.action?.trim();
  if (!slug || !id || !actionName) {
    return { ok: false, status: 400, message: "Malformed request" };
  }

  const actor = await currentActor();
  const app = findApp(slug);
  if (!app) return { ok: false, status: 404, message: `Unknown app "${slug}"` };

  const action: Action | undefined = (app.config.actions ?? []).find(
    (candidate) => candidate.name === actionName,
  );
  if (!action) {
    return {
      ok: false,
      status: 404,
      message: `Unknown action "${actionName}" for app "${slug}"`,
    };
  }

  if (!actor || !canRunAction(actor, app.config, actionName)) {
    // A denied attempt is still an audited event. Written with the actor we
    // resolved, or as an anonymous attempt when no identity was selected.
    await prisma.auditLog.create({
      data: auditData({
        actor: actor ?? { id: "anonymous", email: "anonymous", name: "", roles: [] },
        config: app.config,
        slug,
        recordId: id,
        action: actionName,
        outcome: "denied",
        before: null,
        after: null,
      }),
    });
    return { ok: false, status: 403, message: "Forbidden" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const delegate = writeDelegate(tx, app.config.resource);
      const before = await delegate.findUnique({ where: { id } });
      if (!before) {
        return {
          ok: false as const,
          status: 404 as const,
          message: `Unknown ${app.config.resource} "${id}"`,
        };
      }

      const after = await delegate.update({ where: { id }, data: action.effect.set });
      await tx.auditLog.create({
        data: auditData({
          actor,
          config: app.config,
          slug,
          recordId: id,
          action: actionName,
          outcome: "applied",
          before,
          after,
        }),
      });

      return { ok: true as const, outcome: "applied" as const, row: after };
    });
  } catch {
    return { ok: false, status: 400, message: "Could not apply this action" };
  }
}
