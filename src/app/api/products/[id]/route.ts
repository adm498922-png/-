import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeProductInput } from "@/lib/product-input";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const input = await req.json();
  const data = normalizeProductInput(input);
  if (data.name === null) {
    return NextResponse.json(
      { error: "상품명은 비워둘 수 없습니다." },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) patch[key] = value;
  };
  assign("name", data.name);
  assign("brand", data.brand);
  assign("imageUrl", data.imageUrl);
  assign("memo", data.memo);
  assign("retailPrice", data.retailPrice);
  assign("supplyPrice", data.supplyPrice);
  assign("commissionRate", data.commissionRate);
  assign("isActive", data.isActive);

  const product = await prisma.product.update({
    where: { id },
    data: patch,
    include: { deals: true },
  });
  return NextResponse.json(product);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // 진행 기록이 남아 있는 상품은 지우지 않고 "판매 종료"로만 내린다.
  const dealCount = await prisma.deal.count({ where: { productId: id } });
  if (dealCount > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      message: "이 상품으로 진행한 공구 기록이 있어서, 삭제 대신 '판매 종료'로 바꿨습니다.",
    });
  }
  await prisma.product.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
