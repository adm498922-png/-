import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.settlementNote.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => ({}));
  const memo = typeof input.memo === "string" ? input.memo.trim() : "";

  if (!memo) {
    return NextResponse.json({ error: "메모를 입력해주세요." }, { status: 400 });
  }

  const item = await prisma.settlementNote.create({
    data: {
      memo,
      date: typeof input.date === "string" && input.date.trim() ? input.date.trim() : null,
      images:
        typeof input.images === "string" && input.images.trim() ? input.images.trim() : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
