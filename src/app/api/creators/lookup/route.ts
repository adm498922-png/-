import { NextRequest, NextResponse } from "next/server";
import {
  InstagramLookupError,
  extractInstagramHandle,
  fetchInstagramProfile,
} from "@/lib/instagram-discovery";

// 인스타 아이디(또는 프로필 주소)를 받아서 화면 입력칸을 채울 값을 돌려준다.
export async function POST(req: NextRequest) {
  const { input } = await req.json().catch(() => ({ input: "" }));

  if (typeof input !== "string" || !input.trim()) {
    return NextResponse.json(
      { error: "인스타그램 아이디나 프로필 주소를 넣어주세요." },
      { status: 400 }
    );
  }

  const handle = extractInstagramHandle(input);
  if (!handle) {
    return NextResponse.json(
      {
        error:
          "아이디를 알아보지 못했습니다. '@아이디' 또는 프로필 주소를 넣어주세요. (게시물 주소가 아니라 프로필 주소여야 합니다)",
      },
      { status: 400 }
    );
  }

  // 연결이 안 되어 있어도 아이디·주소·채널은 채워줄 수 있다.
  const basePrefill = {
    platform: "INSTAGRAM",
    handle,
    profileUrl: `https://www.instagram.com/${handle}/`,
  };

  try {
    const profile = await fetchInstagramProfile(handle);
    return NextResponse.json({
      ok: true,
      source: "instagram",
      prefill: {
        ...basePrefill,
        name: profile.name || handle,
        handle: profile.username,
        followers: profile.followers === null ? "" : String(profile.followers),
        bio: profile.bio ?? "",
        linkInBio: profile.website ?? "",
        profileImageUrl: profile.profileImageUrl ?? "",
        igUserId: profile.igUserId ?? "",
        postCount: profile.postCount === null ? "" : String(profile.postCount),
        avgLikes: profile.avgLikes === null ? "" : String(profile.avgLikes),
        avgComments:
          profile.avgComments === null ? "" : String(profile.avgComments),
        engagementRate:
          profile.engagementRate === null ? "" : String(profile.engagementRate),
        syncedAt: new Date().toISOString(),
      },
      summary: {
        followers: profile.followers,
        engagementRate: profile.engagementRate,
        recentPostCount: profile.recentPostCount,
      },
    });
  } catch (err) {
    const e = err as InstagramLookupError;
    const code = e?.code ?? "FAILED";
    return NextResponse.json(
      {
        ok: false,
        code,
        error: e?.message ?? "불러오지 못했습니다.",
        // 실패해도 아이디·주소는 채워준다. 나머지는 손으로 적으면 된다.
        prefill: basePrefill,
      },
      { status: 200 }
    );
  }
}
