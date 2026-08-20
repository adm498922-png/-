import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  InstagramLookupError,
  fetchInstagramProfile,
} from "@/lib/instagram-discovery";

// 이미 등록된 크리에이터의 팔로워 수·참여율을 인스타에서 다시 읽어온다.
export async function POST(
  _req: NextRequest,
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
  if (creator.platform !== "INSTAGRAM" || !creator.handle) {
    return NextResponse.json(
      { error: "인스타그램 아이디가 등록된 크리에이터만 새로고침할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const profile = await fetchInstagramProfile(creator.handle);
    const updated = await prisma.creator.update({
      where: { id },
      data: {
        // 이름·분야·메모처럼 사용자가 직접 손댔을 수 있는 값은 덮어쓰지 않는다.
        followers: profile.followers ?? creator.followers,
        bio: profile.bio ?? creator.bio,
        linkInBio: profile.website ?? creator.linkInBio,
        profileImageUrl: profile.profileImageUrl ?? creator.profileImageUrl,
        postCount: profile.postCount ?? creator.postCount,
        avgLikes: profile.avgLikes,
        avgComments: profile.avgComments,
        engagementRate: profile.engagementRate,
        igUserId: profile.igUserId ?? creator.igUserId,
        syncedAt: new Date(),
      },
      include: {
        deals: { include: { product: true }, orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json({ ok: true, creator: updated });
  } catch (err) {
    const e = err as InstagramLookupError;
    return NextResponse.json(
      { ok: false, code: e?.code ?? "FAILED", error: e?.message ?? "새로고침하지 못했습니다." },
      { status: 200 }
    );
  }
}
