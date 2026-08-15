import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const IDENTITY_COOKIE = "dev_user_email";

export type Actor = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

/**
 * The single point where identity is resolved.
 *
 * This is deliberately NOT authentication: there is no login, and the browser
 * simply names the user it wants to be via the `dev_user_email` cookie set by
 * the header dropdown. In production this function is the only thing that
 * changes — it reads the subject claim from an OIDC provider's verified session
 * instead of a cookie, and loads the same User row. Nothing downstream of here
 * (permission checks, audit entries, the choke point in lib/mutate.ts) knows or
 * cares where the identity came from, so nothing downstream changes.
 */
export async function currentActor(): Promise<Actor | null> {
  const email = (await cookies()).get(IDENTITY_COOKIE)?.value;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, roles: user.roles };
}

export function listUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
