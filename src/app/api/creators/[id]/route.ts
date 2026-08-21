import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCreatorInput } from "@/lib/creator-input";
import { tidyBio } from "@/lib/profile-text";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const creator = await prisma.creator.findUnique({
    where: { id },
    include: { deals: { include: { product: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!creator) {
    return NextResponse.json(
      { error: "크리에이터를 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  return NextResponse.json(creator);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.creator.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "크리에이터를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const input = await req.json();
  const data = normalizeCreatorInput(input);

  if (data.name === null) {
    return NextResponse.json(
      { error: "이름(활동명)은 비워둘 수 없습니다." },
      { status: 400 }
    );
  }

  // 화면이 보낸 항목만 골라서 바꾼다. 안 보낸 항목은 건드리지 않는다.
  const patch: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) patch[key] = value;
  };
  assign("name", data.name);
  assign("handle", data.handle);
  assign("profileUrl", data.profileUrl);
  assign("category", data.category);
  assign("contactType", data.contactType);
  assign("contact", data.contact);
  assign("tags", data.tags);
  assign("memo", data.memo);
  assign("color", data.color);
  if (data.bio !== undefined) {
    // 소개글을 다듬을 때는 이번에 같이 안 보낸 아이디·링크도 저장된 값으로 채워서 본다
    patch.bio = tidyBio(
      data.bio,
      data.handle ?? existing.handle,
      data.linkInBio ?? existing.linkInBio
    );
  }
  assign("linkInBio", data.linkInBio);
  assign("profileImageUrl", data.profileImageUrl);
  assign("igUserId", data.igUserId);
  assign("isBusiness", data.isBusiness);
  assign("platform", data.platform);
  assign("status", data.status);
  if ("followers" in input) patch.followers = data.followers;
  if ("following" in input) patch.following = data.following;
  if ("feeKrw" in input) patch.feeKrw = data.feeKrw;
  if ("commissionRate" in input) patch.commissionRate = data.commissionRate;
  if ("rating" in input) patch.rating = data.rating;
  if (data.hasLastContactField) patch.lastContactAt = data.lastContactAt;
  if ("postCount" in input) patch.postCount = data.postCount;
  if ("avgLikes" in input) patch.avgLikes = data.avgLikes;
  if ("avgComments" in input) patch.avgComments = data.avgComments;
  if ("engagementRate" in input) patch.engagementRate = data.engagementRate;
  if (data.hasSyncedAtField) patch.syncedAt = data.syncedAt;

  const creator = await prisma.creator.update({
    where: { id },
    data: patch,
    include: { deals: { include: { product: true }, orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json(creator);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.creator.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
