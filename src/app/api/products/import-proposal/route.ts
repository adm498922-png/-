import { NextRequest, NextResponse } from "next/server";
import { readXlsx } from "@/lib/xlsx-read";
import { parseProposalText } from "@/lib/proposal-parse";
import { saveAsset, assetRoutePath } from "@/lib/asset-storage";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * 업체 제안서(xlsx)를 올리면 텍스트+이미지를 뽑아 AI로 정리한 뒤,
 * 저장은 하지 않고 미리보기(draft)만 돌려준다. 사장님이 확인/수정하고
 * 따로 '저장'을 눌러야 실제 상품으로 남는다.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType !== XLSX_MIME) {
      return NextResponse.json(
        { error: `엑셀(.xlsx) 파일만 올릴 수 있어요. (받은 형식: ${contentType || "알 수 없음"})` },
        { status: 400 }
      );
    }

    const originalName = req.headers.get("x-file-name")
      ? decodeURIComponent(req.headers.get("x-file-name")!)
      : "제안서.xlsx";

    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "파일이 비어 있습니다." }, { status: 400 });
    }
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 용량이 너무 커요 (15MB 이하로 올려주세요)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    let content;
    try {
      content = await readXlsx(buffer);
    } catch (e) {
      console.error("제안서 xlsx 읽기 실패", e);
      return NextResponse.json(
        { error: "엑셀 파일을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해주세요." },
        { status: 400 }
      );
    }

    if (!content.text.trim()) {
      return NextResponse.json(
        { error: "엑셀에서 글자를 찾지 못했습니다. 표 형태의 제안서인지 확인해주세요." },
        { status: 400 }
      );
    }

    const parsed = await parseProposalText(content.text);

    // 원본 파일과 상품 사진들을 먼저 저장해둔다 (AI 추출과 별개로, 실패해도 다시 안 올리게).
    const proposalFileUrl = assetRoutePath(saveAsset(buffer, XLSX_MIME, originalName));
    const images = content.images.map((img) =>
      assetRoutePath(saveAsset(img.data, img.mime))
    );

    return NextResponse.json({
      draft: parsed,
      images,
      proposalFileUrl,
      proposalFileName: originalName,
    });
  } catch (e) {
    console.error("제안서 가져오기 실패", e);
    return NextResponse.json(
      { error: `제안서를 읽는 중 오류가 발생했습니다: ${describeError(e)}` },
      { status: 500 }
    );
  }
}
