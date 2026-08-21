import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const events = await prisma.calendarEvent.findMany({
    where:
      from && to
        ? { date: { gte: new Date(from), lte: new Date(to) } }
        : undefined,
    orderBy: { date: "asc" },
    include: { creator: { select: { id: true, name: true } } },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  }
  const date = typeof body.date === "string" ? new Date(body.date) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "날짜를 입력해주세요." }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      kind: body.kind === "TODO" ? "TODO" : "EVENT",
      date,
      endDate:
        typeof body.endDate === "string" && body.endDate
          ? new Date(body.endDate)
          : null,
      memo: typeof body.memo === "string" ? body.memo.trim() || null : null,
      creatorId: typeof body.creatorId === "string" && body.creatorId ? body.creatorId : null,
    },
    include: { creator: { select: { id: true, name: true } } },
  });
  return NextResponse.json(event, { status: 201 });
}
