import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 달력에 뿌릴 항목을 한 번에 모아준다.
 * - 직접 추가한 일정·할일 (CalendarEvent)
 * - 공구 기록에서 자동으로 뽑은 날짜(판매 시작·종료, 정산예정일) — 따로 입력할 필요 없이
 *   판매일보에 적어둔 것이 그대로 달력에 보이게 한다
 */

type CalItem = {
  id: string;
  source: "event" | "todo" | "deal";
  title: string;
  date: string;
  done?: boolean;
  href?: string;
  colorClass: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from, to 가 필요합니다." }, { status: 400 });
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const [events, deals] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      orderBy: { date: "asc" },
    }),
    prisma.deal.findMany({
      where: {
        OR: [
          { startDate: { gte: fromDate, lte: toDate } },
          { endDate: { gte: fromDate, lte: toDate } },
          { settleDueDate: { gte: fromDate, lte: toDate } },
        ],
      },
      include: {
        creator: { select: { id: true, name: true } },
        product: { select: { name: true } },
      },
    }),
  ]);

  const items: CalItem[] = [];

  for (const e of events) {
    items.push({
      id: e.id,
      source: e.kind === "TODO" ? "todo" : "event",
      title: e.title,
      date: e.date.toISOString(),
      done: e.done,
      colorClass:
        e.kind === "TODO" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700",
    });
  }

  for (const d of deals) {
    const name = d.creator?.name ?? "?";
    const product = d.product?.name ?? d.productName ?? "";
    if (d.startDate && d.startDate >= fromDate && d.startDate <= toDate) {
      items.push({
        id: `deal-start-${d.id}`,
        source: "deal",
        title: `${name} · ${product} 판매 시작`,
        date: d.startDate.toISOString(),
        href: `/creators/${d.creatorId}`,
        colorClass: "bg-sky-100 text-sky-700",
      });
    }
    if (d.endDate && d.endDate >= fromDate && d.endDate <= toDate) {
      items.push({
        id: `deal-end-${d.id}`,
        source: "deal",
        title: `${name} · ${product} 판매 종료`,
        date: d.endDate.toISOString(),
        href: `/creators/${d.creatorId}`,
        colorClass: "bg-slate-100 text-slate-600",
      });
    }
    if (d.settleDueDate && d.settleDueDate >= fromDate && d.settleDueDate <= toDate && !d.settledAt) {
      items.push({
        id: `deal-settle-${d.id}`,
        source: "deal",
        title: `${name} · ${product} 정산 예정`,
        date: d.settleDueDate.toISOString(),
        href: `/creators/${d.creatorId}`,
        colorClass: "bg-red-100 text-red-700",
      });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json(items);
}
