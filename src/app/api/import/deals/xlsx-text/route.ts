import { NextRequest, NextResponse } from "next/server";
import { readXlsxTable } from "@/lib/xlsx-read";

/**
 * 판매일보 엑셀(.xlsx) 파일을 받아서, 붙여넣기 가져오기와 같은
 * 탭 구분 표 텍스트로 바꿔준다. 이후 미리보기/등록은 기존
 * /api/import/deals 흐름을 그대로 쓴다.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "엑셀(.xlsx) 파일만 올릴 수 있어요. (엑셀에서 '다른 이름으로 저장 → .xlsx')" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await readXlsxTable(buffer);
  } catch {
    return NextResponse.json(
      { error: "엑셀 파일을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해주세요." },
      { status: 400 }
    );
  }
  if (!text.trim()) {
    return NextResponse.json(
      { error: "엑셀 첫 번째 시트에서 내용을 찾지 못했습니다." },
      { status: 400 }
    );
  }
  return NextResponse.json({ text });
}
