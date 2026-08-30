import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CREATOR_COLORS } from "@/lib/gonggu";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.done === "boolean") patch.done = body.done;
  if (typeof body.memo === "string") patch.memo = body.memo.trim() || null;
  if (typeof body.images === "string") patch.images = body.images.trim() || null;
  if (typeof body.date === "string") patch.date = new Date(body.date);
  if ("endDate" in body) {
    patch.endDate =
      typeof body.endDate === "string" && body.endDate ? new Date(body.endDate) : null;
  }
  if ("color" in body) {
    patch.color =
      typeof body.color === "string" && (CREATOR_COLORS as readonly string[]).includes(body.color)
        ? body.color
        : null;
  }

  const event = await prisma.calendarEvent
    .update({ where: { id }, data: patch, include: { creator: { select: { id: true, name: true } } } })
    .catch(() => null);
  if (!event) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.calendarEvent.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
