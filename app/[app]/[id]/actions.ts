"use server";

import { revalidatePath } from "next/cache";
import { applyEffect } from "@/lib/query";
import { findApp } from "@/lib/registry";

export async function runAction(slug: string, id: string, actionName: string) {
  const app = findApp(slug);
  if (!app) throw new Error(`Unknown app "${slug}"`);

  const action = (app.config.actions ?? []).find(
    (candidate) => candidate.name === actionName,
  );
  if (!action) throw new Error(`Unknown action "${actionName}" for app "${slug}"`);

  await applyEffect(app.config, id, action.effect.set);
  revalidatePath(`/${slug}/${id}`);
  revalidatePath(`/${slug}`);
}
