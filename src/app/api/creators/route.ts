import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCreatorInput } from "@/lib/creator-input";

export async function GET() {
  const creators = await prisma.creator.findMany({
    orderBy: { updatedAt: "desc" },
    include: { deals: true },
  });
  return NextResponse.json(creators);
}

export async function POST(req: NextRequest) {
  const input = await req.json();
  const data = normalizeCreatorInput(input);

  if (!data.name) {
    return NextResponse.json(
      { error: "이름(활동명)을 입력해주세요." },
      { status: 400 }
    );
  }

  const creator = await prisma.creator.create({
    data: {
      name: data.name,
      platform: data.platform ?? "INSTAGRAM",
      handle: data.handle ?? null,
      profileUrl: data.profileUrl ?? null,
      followers: data.followers,
      category: data.category ?? null,
      contactType: data.contactType ?? null,
      contact: data.contact ?? null,
      feeKrw: data.feeKrw,
      commissionRate: data.commissionRate,
      status: (data.status ?? "LEAD") as never,
      rating: data.rating,
      tags: data.tags ?? null,
      memo: data.memo ?? null,
      lastContactAt: data.lastContactAt,
      bio: data.bio ?? null,
      linkInBio: data.linkInBio ?? null,
      profileImageUrl: data.profileImageUrl ?? null,
      igUserId: data.igUserId ?? null,
      postCount: data.postCount,
      avgLikes: data.avgLikes,
      avgComments: data.avgComments,
      engagementRate: data.engagementRate,
      syncedAt: data.syncedAt,
    },
    include: { deals: true },
  });

  return NextResponse.json(creator, { status: 201 });
}
