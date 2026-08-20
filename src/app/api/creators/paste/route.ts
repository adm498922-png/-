import { NextRequest, NextResponse } from "next/server";
import { parseProfilePaste } from "@/lib/profile-paste";

// 프로필 화면에서 복사한 글을 붙여넣으면 AI가 항목별로 나눠준다.
export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({ text: "" }));

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "붙여넣은 내용이 비어 있습니다." },
      { status: 400 }
    );
  }

  try {
    const p = await parseProfilePaste(text);
    return NextResponse.json({
      ok: true,
      source: "paste",
      prefill: {
        platform: "INSTAGRAM",
        name: p.name ?? "",
        handle: p.handle ?? "",
        followers: p.followers === null ? "" : String(p.followers),
        postCount: p.postCount === null ? "" : String(p.postCount),
        bio: p.bio ?? "",
        category: p.category ?? "",
        linkInBio: p.linkInBio ?? "",
        tags: p.tags ?? "",
        profileUrl:
          p.profileUrl ??
          (p.handle ? `https://www.instagram.com/${p.handle}/` : ""),
      },
      isGongguCreator: p.isGongguCreator,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "내용을 읽지 못했습니다." },
      { status: 400 }
    );
  }
}
