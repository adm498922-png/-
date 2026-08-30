import { NextRequest, NextResponse } from "next/server";
import { saveAsset, assetRoutePath } from "@/lib/asset-storage";

// 메모·루틴·일정에 붙이는 사진 업로드. 로그인 확인은 proxy 미들웨어가 해준다.
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (!IMAGE_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: "사진 파일(png, jpg, webp, gif)만 올릴 수 있어요." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "사진이 너무 커요. 10MB 이하로 올려주세요." },
      { status: 400 }
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = saveAsset(buffer, file.type, file.name);
  return NextResponse.json({ url: assetRoutePath(id) });
}
