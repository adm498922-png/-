import { NextRequest, NextResponse } from "next/server";
import { readVideoFile } from "@/lib/media-storage";

// Threads(메타) 서버가 영상을 가져갈 때 인증 없이 접근해야 하므로 이 경로는 공개 접근을 허용한다.
const FILENAME_PATTERN = /^[a-z0-9]+\.mp4$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!FILENAME_PATTERN.test(filename)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const linkId = filename.replace(/\.mp4$/, "");
  const data = readVideoFile(linkId);
  if (!data) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
