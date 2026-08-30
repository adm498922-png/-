import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const input = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof input.memo === "string") {
    const memo = input.memo.trim();
    if (!memo) {
      return NextResponse.json({ error: "메모는 비워둘 수 없습니다." }, { status: 400 });
    }
    patch.memo = memo;
  }
  if (typeof input.date === "string") {
    patch.date = input.date.trim() || null;
  }
  if (typeof input.images === "string") {
    patch.images = input.images.trim() || null;
  }

  const item = await prisma.settlementNote.update({ where: { id }, data: patch });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.settlementNote.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
