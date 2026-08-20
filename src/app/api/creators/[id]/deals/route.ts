import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDealInput } from "@/lib/deal-input";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const creator = await prisma.creator.findUnique({ where: { id } });
  if (!creator) {
    return NextResponse.json(
      { error: "크리에이터를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const input = await req.json();
  const data = normalizeDealInput(input);

  if (!data.productId && !data.productName) {
    return NextResponse.json(
      { error: "상품을 고르거나 상품명을 직접 입력해주세요." },
      { status: 400 }
    );
  }

  const deal = await prisma.deal.create({
    data: {
      creatorId: id,
      productId: data.productId ?? null,
      productName: data.productName ?? null,
      status: (data.status ?? "PLANNED") as never,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      unitsSold: data.unitsSold ?? null,
      revenue: data.revenue ?? null,
      settlement: data.settlement ?? null,
      memo: data.memo ?? null,
    },
    include: { product: true },
  });

  return NextResponse.json(deal, { status: 201 });
}
