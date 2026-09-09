import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dealDupKey } from "@/lib/deals-import";

/**
 * 중복 공구 기록 정리 — 같은 셀러 + 같은 시작일 + 같은 상품이 여러 건이면
 * 하나만 남기고 지운다. 남기는 기준: 적힌 내용(매출·정산 등)이 더 많은 것,
 * 같으면 먼저 만든 것.
 *
 * mode "preview"면 몇 건이 지워질지만 알려주고, "commit"이어야 실제 삭제.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "commit" ? "commit" : "preview";

  const deals = await prisma.deal.findMany({
    include: { product: { select: { name: true } }, creator: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const filledCount = (d: (typeof deals)[number]) =>
    [
      d.revenue,
      d.settlement,
      d.commissionRate,
      d.salesCommission,
      d.contentFee,
      d.agencyRate,
      d.agencyFee,
      d.settleDueDate,
      d.settledAt,
      d.endDate,
      d.unitsSold,
      d.memo,
    ].filter((v) => v !== null && v !== "").length;

  const groups = new Map<string, typeof deals>();
  for (const d of deals) {
    const key = dealDupKey(d);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }

  const toDelete: { id: string; label: string }[] = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // 내용이 제일 알찬 것(동률이면 먼저 만든 것)을 남긴다
    const keeper = [...group].sort(
      (a, b) =>
        filledCount(b) - filledCount(a) ||
        a.createdAt.getTime() - b.createdAt.getTime()
    )[0];
    for (const d of group) {
      if (d.id !== keeper.id) {
        toDelete.push({
          id: d.id,
          label: `${d.creator?.name ?? "?"} · ${d.productName ?? d.product?.name ?? "상품 미지정"}`,
        });
      }
    }
  }

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      willDelete: toDelete.length,
      sample: toDelete.slice(0, 10).map((t) => t.label),
    });
  }

  if (toDelete.length > 0) {
    await prisma.deal.deleteMany({ where: { id: { in: toDelete.map((t) => t.id) } } });
  }
  return NextResponse.json({ ok: true, deleted: toDelete.length });
}
