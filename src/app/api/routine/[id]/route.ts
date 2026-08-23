import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const input = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof input.weekday === "number" && input.weekday >= 0 && input.weekday <= 6) {
    patch.weekday = input.weekday;
  }
  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) {
      return NextResponse.json({ error: "제목은 비워둘 수 없습니다." }, { status: 400 });
    }
    patch.title = title;
  }
  if (typeof input.time === "string") {
    patch.time = input.time.trim() || null;
  }
  if (typeof input.memo === "string") {
    patch.memo = input.memo.trim() || null;
  }

  const item = await prisma.routineItem.update({ where: { id }, data: patch });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.routineItem.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
