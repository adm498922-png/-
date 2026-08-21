import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCampaignInput } from "@/lib/campaign-input";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignments: true },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const input = await req.json();
  const data = normalizeCampaignInput(input);

  if (!data.brand || !data.name) {
    return NextResponse.json(
      { error: "브랜드와 캠페인명을 입력해주세요." },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      type: (data.type ?? "AD") as never,
      brand: data.brand,
      name: data.name,
      category: data.category ?? null,
      desc: data.desc ?? null,
      status: (data.status ?? "DRAFT") as never,
      microTarget: data.microTarget ?? null,
      macroTarget: data.macroTarget ?? null,
      megaTarget: data.megaTarget ?? null,
      budget: data.budget ?? null,
      period: data.period ?? null,
      productShip: data.productShip ?? null,
      secondaryUse: data.secondaryUse ?? null,
      salePrice: data.salePrice ?? null,
      listPrice: data.listPrice ?? null,
      commissionRate: data.commissionRate ?? null,
      targetQty: data.targetQty ?? null,
      collabStart: data.collabStart ?? null,
      collabEnd: data.collabEnd ?? null,
      promo: data.promo ?? null,
    },
    include: { assignments: true },
  });

  return NextResponse.json(campaign, { status: 201 });
}
