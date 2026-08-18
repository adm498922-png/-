import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveVideoFile, videoRoutePath } from "@/lib/media-storage";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set(["video/mp4"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const link = await prisma.coupangLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }
  if (link.videoStatus === "GENERATING") {
    return NextResponse.json(
      { error: "AI 영상을 생성하는 중에는 직접 올릴 수 없어요. 완료 후 다시 시도해주세요." },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("video");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "영상 파일이 없습니다." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "mp4 형식의 영상만 업로드할 수 있어요." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "영상 용량이 너무 커요 (50MB 이하로 올려주세요)." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  saveVideoFile(id, buffer);

  const updated = await prisma.coupangLink.update({
    where: { id },
    data: {
      videoStatus: "READY",
      videoUrl: videoRoutePath(id),
      videoJobId: null,
      videoError: null,
    },
  });

  return NextResponse.json(updated);
}
