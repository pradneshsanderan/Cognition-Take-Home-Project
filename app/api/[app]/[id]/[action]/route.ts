import { NextResponse } from "next/server";
import { runAppAction } from "@/lib/mutate";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/[app]/[id]/[action]">,
) {
  const { app, id, action } = await params;

  // Everything — identity, permission check, audit entry, the write itself —
  // happens inside the choke point. This route only maps its result to HTTP.
  const result = await runAppAction({ slug: app, id, action });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.redirect(new URL(`/${app}/${id}`, request.url), 303);
}
