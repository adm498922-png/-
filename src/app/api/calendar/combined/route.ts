import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 달력에 뿌릴 항목을 한 번에 모아준다.
 * - 직접 추가한 일정·할일 (CalendarEvent) — 종료일(endDate)이 있으면 기간(막대)으로 취급
 * - 공구 기록에서 자동으로 뽑은 날짜(판매 시작~종료 기간, 정산예정일) — 따로 입력할 필요 없이
 *   판매일보에 적어둔 것이 그대로 달력에 보이게 한다
 *
 * date~endDate가 둘 다 있고 서로 다른 날이면 화면에서 여러 날에 걸친 막대로 그린다
 * (구글 캘린더처럼). 하루짜리 항목은 endDate를 안 보낸다.
 */

type CalItem = {
  id: string;
  source: "event" | "todo" | "deal";
  title: string;
  date: string;
  endDate?: string;
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
      where: {
        OR: [
          { date: { gte: fromDate, lte: toDate } },
          { endDate: { gte: fromDate, lte: toDate } },
          { AND: [{ date: { lte: fromDate } }, { endDate: { gte: toDate } }] },
        ],
      },
      orderBy: { date: "asc" },
    }),
    prisma.deal.findMany({
      where: {
        OR: [
          // 기간(시작~종료)이 이 화면과 겹치는 경우
          { AND: [{ startDate: { lte: toDate } }, { endDate: { gte: fromDate } }] },
          // 시작일만 있는 경우
          { AND: [{ startDate: { gte: fromDate, lte: toDate } }, { endDate: null }] },
          // 종료일만 있는 경우
          { AND: [{ endDate: { gte: fromDate, lte: toDate } }, { startDate: null }] },
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
    const sameDay =
      !e.endDate || e.endDate.toDateString() === e.date.toDateString();
    items.push({
      id: e.id,
      source: e.kind === "TODO" ? "todo" : "event",
      title: e.title,
      date: e.date.toISOString(),
      endDate: sameDay ? undefined : e.endDate!.toISOString(),
      done: e.done,
      colorClass:
        e.kind === "TODO" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700",
    });
  }

  for (const d of deals) {
    const name = d.creator?.name ?? "?";
    const product = d.product?.name ?? d.productName ?? "";
    if (d.startDate && d.endDate) {
      // 판매 시작~종료를 하나의 기간(막대)으로 합쳐서 보여준다.
      const sameDay = d.startDate.toDateString() === d.endDate.toDateString();
      items.push({
        id: `deal-run-${d.id}`,
        source: "deal",
        title: `${name} · ${product} 공구 진행`,
        date: d.startDate.toISOString(),
        endDate: sameDay ? undefined : d.endDate.toISOString(),
        href: `/creators/${d.creatorId}`,
        colorClass: "bg-sky-100 text-sky-700",
      });
    } else if (d.startDate) {
      items.push({
        id: `deal-start-${d.id}`,
        source: "deal",
        title: `${name} · ${product} 판매 시작`,
        date: d.startDate.toISOString(),
        href: `/creators/${d.creatorId}`,
        colorClass: "bg-sky-100 text-sky-700",
      });
    } else if (d.endDate) {
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
