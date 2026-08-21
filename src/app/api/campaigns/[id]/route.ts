import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCampaignInput } from "@/lib/campaign-input";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { assignments: { include: { creator: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(campaign);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  }

  const input = await req.json();
  const data = normalizeCampaignInput(input);
  if (data.brand === null || data.name === null) {
    return NextResponse.json(
      { error: "브랜드와 캠페인명은 비워둘 수 없습니다." },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) patch[key] = value;
  };
  assign("type", data.type);
  assign("brand", data.brand);
  assign("name", data.name);
  assign("category", data.category);
  assign("desc", data.desc);
  assign("status", data.status);
  assign("microTarget", data.microTarget);
  assign("macroTarget", data.macroTarget);
  assign("megaTarget", data.megaTarget);
  assign("budget", data.budget);
  assign("period", data.period);
  assign("productShip", data.productShip);
  assign("secondaryUse", data.secondaryUse);
  assign("salePrice", data.salePrice);
  assign("listPrice", data.listPrice);
  assign("commissionRate", data.commissionRate);
  assign("targetQty", data.targetQty);
  assign("collabStart", data.collabStart);
  assign("collabEnd", data.collabEnd);
  assign("promo", data.promo);

  const campaign = await prisma.campaign.update({
    where: { id },
    data: patch,
    include: { assignments: true },
  });

  return NextResponse.json(campaign);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.campaign.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
