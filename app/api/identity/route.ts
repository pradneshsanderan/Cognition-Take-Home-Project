import { NextResponse } from "next/server";
import { IDENTITY_COOKIE } from "@/lib/identity";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Dev identity only: names the seeded user the browser wants to be. See the
// comment on currentActor() in lib/identity.ts.
export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  if (typeof email !== "string") {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  if (email === "") {
    response.cookies.delete(IDENTITY_COOKIE);
    return response;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 404 });
  }

  response.cookies.set(IDENTITY_COOKIE, user.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
