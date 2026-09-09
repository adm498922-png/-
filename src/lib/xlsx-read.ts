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

// ── 판매일보 가져오기용: 표 모양을 그대로 살려서 읽기 ─────────────────────────
// 위의 readXlsx는 글자만 훑기 때문에 빈 칸이 사라져 열이 밀린다. 판매일보처럼
// "몇 번째 칸이 무엇인지"가 중요한 표는 칸 주소(A1, B1…)를 보고 자리를 지키며 읽고,
// 엑셀이 숫자로 저장하는 날짜도 날짜 서식이면 YYYY-MM-DD 글자로 바꿔준다.

/** 엑셀 날짜 일련번호(1900년 기준) → YYYY-MM-DD */
function serialToDateString(serial: number): string {
  // 25569 = 1970-01-01의 엑셀 일련번호
  const d = new Date(Math.round((serial - 25569) * 86400000));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 셀 주소("BC12")에서 열 번호(0부터)를 얻는다 */
function colIndexOf(ref: string): number {
  let idx = 0;
  for (const ch of ref) {
    if (ch < "A" || ch > "Z") break;
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

/** 엑셀 기본 서식 번호 중 날짜/시간 서식들 */
function isBuiltinDateFormat(id: number): boolean {
  return (
    (id >= 14 && id <= 22) ||
    (id >= 27 && id <= 31) ||
    (id >= 34 && id <= 36) ||
    (id >= 45 && id <= 47) ||
    (id >= 50 && id <= 58)
  );
}

export async function readXlsxTable(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  const sharedStrings: string[] = [];
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  if (sharedXml) {
    for (const m of sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
      sharedStrings.push(unescapeXml(m[1]));
    }
  }

  // 서식 정보: 어떤 셀 스타일(s 속성)이 날짜 서식인지 미리 표를 만든다
  const dateStyle: boolean[] = [];
  const stylesXml = await zip.file("xl/styles.xml")?.async("string");
  if (stylesXml) {
    const customDateFmt = new Set<number>();
    for (const m of stylesXml.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
      // 따옴표 안 글자·[색] 표시를 뺀 나머지에 y/m/d가 있으면 날짜 서식으로 본다
      const code = m[2].replace(/&quot;[^&]*&quot;|"[^"]*"|\[[^\]]*\]/g, "");
      if (/[ymd]/i.test(code)) customDateFmt.add(Number(m[1]));
    }
    const cellXfs = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
    for (const m of cellXfs.matchAll(/<xf\b[^>]*>/g)) {
      const id = Number(m[0].match(/numFmtId="(\d+)"/)?.[1] ?? "0");
      dateStyle.push(isBuiltinDateFormat(id) || customDateFmt.has(id));
    }
  }

  // 첫 번째 시트만 읽는다 (판매일보는 보통 첫 시트에 있다)
  const sheetNames = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort();
  const sheetXml = sheetNames[0]
    ? await zip.file(sheetNames[0])?.async("string")
    : null;
  if (!sheetXml) return "";

  const rows: string[] = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
    )) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const col = ref ? colIndexOf(ref) : cells.length;
      const type = attrs.match(/\bt="([a-zA-Z]+)"/)?.[1];
      const styleIdx = Number(attrs.match(/\bs="(\d+)"/)?.[1] ?? "-1");

      let value = "";
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      if (type === "inlineStr") {
        const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = tMatch ? unescapeXml(tMatch[1]) : "";
      } else if (vMatch) {
        value = unescapeXml(vMatch[1]);
        if (type === "s") value = sharedStrings[Number(value)] ?? "";
        else if (type !== "str" && type !== "b") {
          // 숫자 셀: 날짜 서식이면 날짜 글자로 바꾼다
          const num = Number(value);
          if (
            Number.isFinite(num) &&
            num > 20000 &&
            num < 80000 &&
            dateStyle[styleIdx]
          ) {
            value = serialToDateString(num);
          }
        }
      }
      value = value.replace(/[\t\r\n]+/g, " ").trim();

      while (cells.length < col) cells.push("");
      cells[col] = value;
    }
    if (cells.some((c) => c !== "")) rows.push(cells.join("\t"));
  }
  return rows.join("\n");
}
