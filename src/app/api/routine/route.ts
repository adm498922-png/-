import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.routineItem.findMany({
    orderBy: [{ weekday: "asc" }, { time: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => ({}));
  const weekday = Number(input.weekday);
  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "요일이 올바르지 않습니다." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  }

  const item = await prisma.routineItem.create({
    data: {
      weekday,
      title,
      time: typeof input.time === "string" && input.time.trim() ? input.time.trim() : null,
      memo: typeof input.memo === "string" && input.memo.trim() ? input.memo.trim() : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
