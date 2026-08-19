import { NextRequest, NextResponse } from "next/server";
import { readVideoFile } from "@/lib/media-storage";

// Threads(메타) 서버가 영상을 가져갈 때 인증 없이 접근해야 하므로 이 경로는 공개 접근을 허용한다.
const FILENAME_PATTERN = /^[a-z0-9]+\.mp4$/;

/** Threads/메타의 영상 수집기는 Range 요청(부분 다운로드)으로 파일을 먼저 확인하는 경우가 많아 지원 필요 */
function parseRange(
  rangeHeader: string | null,
  size: number
): { start: number; end: number } | null {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
    return null;
  }
  return { start, end };
}

export async function GET(
  req: NextRequest,
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

  const range = parseRange(req.headers.get("range"), data.length);
  if (range) {
    const chunk = data.subarray(range.start, range.end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${range.start}-${range.end}/${data.length}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(data.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
