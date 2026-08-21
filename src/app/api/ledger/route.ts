import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchOrCreateCreator, matchOrCreateProduct } from "@/lib/match-or-create";
import { parseNumber } from "@/lib/gonggu";

/**
 * 판매일보 화면 — 구글 시트 대신 이 사이트 안에서 한 줄씩 바로 쓴다.
 * 크리에이터·상품 이름을 적으면 기존 것과 맞춰지거나 새로 만들어진다.
 * (판매 수량은 이 화면에서는 받지 않는다 — 요청에 따라 뺌)
 */

export async function GET() {
  const deals = await prisma.deal.findMany({
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      creator: { select: { id: true, name: true, handle: true } },
      product: { select: { id: true, name: true, brand: true } },
    },
  });
  return NextResponse.json(deals);
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toMoney(v: unknown): number | null {
  const n = parseNumber(v);
  return n === null ? null : Math.round(n);
}
function toPercent(v: unknown): number | null {
  return parseNumber(v);
}
function toBool(v: unknown): boolean {
  return v === true;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const creatorName = typeof body.creatorName === "string" ? body.creatorName.trim() : "";
  if (!creatorName) {
    return NextResponse.json(
      { error: "크리에이터 이름(또는 아이디)을 입력해주세요." },
      { status: 400 }
    );
  }

  const commissionRate = toPercent(body.commissionRate);
  const productName = typeof body.productName === "string" ? body.productName.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() || null : null;

  const creator = await matchOrCreateCreator({
    name: creatorName,
    handle: typeof body.handle === "string" ? body.handle : null,
    commissionRate,
    isBusiness: typeof body.isBusiness === "boolean" ? body.isBusiness : null,
  });

  const product = productName
    ? await matchOrCreateProduct({ name: productName, brand, commissionRate })
    : null;

  const startDate = toDate(body.startDate);
  const endDate = toDate(body.endDate);
  const settledAt = toDate(body.settledAt);
  const settleDueDate = toDate(body.settleDueDate);

  const deal = await prisma.deal.create({
    data: {
      creatorId: creator.id,
      productId: product?.id ?? null,
      productName: productName || null,
      status: settledAt ? "CLOSED" : startDate && startDate > new Date() ? "PLANNED" : "ONGOING",
      startDate,
      endDate,
      revenue: toMoney(body.revenue),
      commissionRate,
      salesCommission: toMoney(body.salesCommission),
      contentFee: toMoney(body.contentFee),
      settlement: toMoney(body.settlement),
      agencyRate: toPercent(body.agencyRate),
      agencyFee: toMoney(body.agencyFee),
      settleDueDate,
      settledAt,
      linkSent: toBool(body.linkSent),
      taxReported: toBool(body.taxReported),
      statementIssued: toBool(body.statementIssued),
      memo: typeof body.memo === "string" ? body.memo.trim() || null : null,
    },
    include: {
      creator: { select: { id: true, name: true, handle: true } },
      product: { select: { id: true, name: true, brand: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    deal,
    creatorCreated: creator.created,
    productCreated: product?.created ?? false,
  });
}
