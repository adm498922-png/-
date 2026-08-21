import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 캠페인에 크리에이터를 한번에 여러 명 배정한다 (매칭). 이미 배정된 사람은 건너뛴다. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  }

  const input = await req.json().catch(() => null);
  const creatorIds = Array.isArray(input?.creatorIds)
    ? input.creatorIds.filter((v: unknown): v is string => typeof v === "string")
    : [];
  if (creatorIds.length === 0) {
    return NextResponse.json({ error: "배정할 크리에이터를 선택해주세요." }, { status: 400 });
  }

  // SQLite의 createMany는 skipDuplicates를 지원하지 않아서, 이미 배정된 사람은 미리 걸러낸다.
  const already = await prisma.campaignAssignment.findMany({
    where: { campaignId, creatorId: { in: creatorIds } },
    select: { creatorId: true },
  });
  const alreadySet = new Set(already.map((a) => a.creatorId));
  const newIds = creatorIds.filter((id: string) => !alreadySet.has(id));

  if (newIds.length > 0) {
    await prisma.campaignAssignment.createMany({
      data: newIds.map((creatorId: string) => ({ campaignId, creatorId })),
    });
  }
  const result = { count: newIds.length };

  if (campaign.status === "DRAFT") {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "ACTIVE" } });
  }

  return NextResponse.json({ ok: true, added: result.count });
}
