import { NextRequest, NextResponse } from "next/server";
import { readAsset, contentTypeFor } from "@/lib/asset-storage";

// 로그인한 사장님만 보게 둔다(전체 공개 X). 로그인 여부는 proxy.ts 미들웨어가 이미 걸러준다.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = readAsset(id);
  if (!data) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": contentTypeFor(id),
    "Content-Length": String(data.length),
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  // 원본 파일명으로 내려받게 하고 싶을 때 ?download=원래파일명.xlsx 로 넘긴다
  const downloadName = req.nextUrl.searchParams.get("download");
  if (downloadName) {
    const encoded = encodeURIComponent(downloadName);
    headers["Content-Disposition"] = `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
  }

  return new NextResponse(new Uint8Array(data), { headers });
}
