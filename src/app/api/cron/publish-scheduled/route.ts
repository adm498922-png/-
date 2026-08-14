import { NextRequest, NextResponse } from "next/server";
import { runDueScheduledPosts } from "@/lib/scheduler";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const queryToken = req.nextUrl.searchParams.get("secret");
  return bearer === secret || queryToken === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await runDueScheduledPosts();
  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
