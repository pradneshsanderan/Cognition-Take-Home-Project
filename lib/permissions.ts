import type { AppConfig } from "@/lib/defineApp";
import type { Actor } from "@/lib/identity";
import { getApps, type App } from "@/lib/apps";

export const AUDIT_ROLES = ["compliance"];

function hasAnyRole(actor: Actor | null, roles: string[]): boolean {
  if (!actor) return false;
  return roles.some((role) => actor.roles.includes(role));
}

export function canView(actor: Actor | null, config: AppConfig): boolean {
  return hasAnyRole(actor, config.permissions.view);
}

export function canRunAction(
  actor: Actor | null,
  config: AppConfig,
  actionName: string,
): boolean {
  if (!canView(actor, config)) return false;
  return hasAnyRole(actor, config.permissions[actionName] ?? []);
}

export function canViewAudit(actor: Actor | null): boolean {
  return hasAnyRole(actor, AUDIT_ROLES);
}

export function visibleApps(actor: Actor | null): App[] {
  return getApps().filter((app) => canView(actor, app.config));
}

export function permittedActions(actor: Actor | null, config: AppConfig) {
  return (config.actions ?? []).filter((action) =>
    canRunAction(actor, config, action.name),
  );
}
