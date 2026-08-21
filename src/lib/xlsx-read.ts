import JSZip from "jszip";

/**
 * xlsx 파일(엑셀)에서 글자와 그림을 뽑아낸다.
 *
 * 업체마다 상품제안서 양식이 제각각이라("소재지" 칸이 어디 있을지 모른다) 정해진 칸
 * 위치를 읽는 방식은 안 쓰고, 시트에 있는 글자를 전부 줄 단위로 훑어서 돌려준다.
 * 이후 AI가 이 글자 뭉치를 보고 항목별로 나눈다.
 *
 * xlsx는 사실 zip 압축 파일이라, 압축을 푼 XML을 직접 읽는다.
 */

export type ExtractedImage = {
  data: Buffer;
  mime: string;
  ext: string;
};

export type XlsxContent = {
  /** 시트에 있는 글자를 사람이 읽는 순서(줄 → 칸)로 나열한 것 */
  text: string;
  /** 시트에 박혀 있던 그림들 (상품 사진 등) */
  images: ExtractedImage[];
};

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
};

export async function readXlsx(buffer: Buffer): Promise<XlsxContent> {
  const zip = await JSZip.loadAsync(buffer);

  // 1) 공유 문자열(엑셀은 같은 글자를 반복해서 안 쓰고 이 표에 모아둔다)
  const sharedStrings: string[] = [];
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  if (sharedXml) {
    for (const m of sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
      sharedStrings.push(unescapeXml(m[1]));
    }
  }

  // 2) 첫 번째 시트의 칸(cell)들을 줄 순서대로 읽는다
  const sheetNames = Object.keys(zip.files).filter((n) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
  );
  sheetNames.sort();
  const lines: string[] = [];

  for (const sheetName of sheetNames.slice(0, 3)) {
    const sheetXml = await zip.file(sheetName)?.async("string");
    if (!sheetXml) continue;

    for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const rowContent = rowMatch[1];
      const cellValues: string[] = [];
      // 칸 하나(<c ...>...</c> 또는 빈 칸이면 <c .../>)를 통째로 잡은 뒤,
      // 속성(어디에 붙어있든 상관없이)과 내용을 따로 읽는다.
      for (const cellMatch of rowContent.matchAll(
        /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
      )) {
        const attrs = cellMatch[1];
        const inner = cellMatch[2] ?? "";
        const type = attrs.match(/\bt="([a-zA-Z]+)"/)?.[1];

        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        let value: string;
        if (type === "inlineStr") {
          const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          value = tMatch ? unescapeXml(tMatch[1]) : "";
        } else if (vMatch) {
          value = vMatch[1];
          if (type === "s") value = sharedStrings[Number(value)] ?? "";
        } else {
          continue;
        }
        value = value.replace(/\r\n/g, " ").trim();
        if (value) cellValues.push(value);
      }
      if (cellValues.length > 0) lines.push(cellValues.join(" | "));
    }
  }

  // 3) 시트에 박힌 그림들 — 상품 사진일 확률이 높다
  const images: ExtractedImage[] = [];
  const mediaFiles = Object.keys(zip.files)
    .filter((n) => /^xl\/media\//.test(n))
    .sort();
  for (const name of mediaFiles) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue; // 아이콘·서명 이미지가 아니라 사진만 고른다
    const data = await zip.file(name)?.async("nodebuffer");
    if (data && data.length > 3000) {
      // 3KB 미만은 보통 장식용 아이콘·로고 조각이라 뺀다
      images.push({ data, mime, ext });
    }
  }

  return { text: lines.join("\n"), images };
}
