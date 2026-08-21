import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeProductInput } from "@/lib/product-input";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { deals: true },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const input = await req.json();
  const data = normalizeProductInput(input);

  if (!data.name) {
    return NextResponse.json({ error: "상품명을 입력해주세요." }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      brand: data.brand ?? null,
      imageUrl: data.imageUrl ?? null,
      images: data.images ?? null,
      retailPrice: data.retailPrice ?? null,
      supplyPrice: data.supplyPrice ?? null,
      commissionRate: data.commissionRate ?? null,
      memo: data.memo ?? null,
      isActive: data.isActive ?? true,
      vendorCompany: data.vendorCompany ?? null,
      vendorContact: data.vendorContact ?? null,
      vendorPhone: data.vendorPhone ?? null,
      vendorEmail: data.vendorEmail ?? null,
      shippingFee: data.shippingFee ?? null,
      returnPolicy: data.returnPolicy ?? null,
      asInfo: data.asInfo ?? null,
      settlementSchedule: data.settlementSchedule ?? null,
      origin: data.origin ?? null,
      composition: data.composition ?? null,
      material: data.material ?? null,
      sizeWeight: data.sizeWeight ?? null,
      noticeExtra: data.noticeExtra ?? null,
      proposalFileUrl: data.proposalFileUrl ?? null,
      proposalFileName: data.proposalFileName ?? null,
    },
    include: { deals: true },
  });
  return NextResponse.json(product, { status: 201 });
}
