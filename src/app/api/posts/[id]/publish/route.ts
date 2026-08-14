import { NextRequest, NextResponse } from "next/server";
import { publishPost } from "@/lib/publish";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await publishPost(id);
  return NextResponse.json({ ok: true });
}
