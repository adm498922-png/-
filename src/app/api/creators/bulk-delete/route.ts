import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => null);
  const ids = Array.isArray(input?.ids)
    ? input.ids.filter((v: unknown): v is string => typeof v === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "삭제할 크리에이터를 선택해주세요." }, { status: 400 });
  }

  const result = await prisma.creator.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
