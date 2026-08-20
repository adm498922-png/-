import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDealInput } from "@/lib/deal-input";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "공구 기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const input = await req.json();
  const data = normalizeDealInput(input);

  const patch: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) patch[key] = value;
  };
  assign("productId", data.productId);
  assign("productName", data.productName);
  assign("memo", data.memo);
  assign("status", data.status);
  assign("startDate", data.startDate);
  assign("endDate", data.endDate);
  assign("unitsSold", data.unitsSold);
  assign("revenue", data.revenue);
  assign("settlement", data.settlement);

  const deal = await prisma.deal.update({
    where: { id },
    data: patch,
    include: { product: true },
  });
  return NextResponse.json(deal);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.deal.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
