import { parseNumber } from "@/lib/gonggu";

/**
 * 판매일보(구글 시트)를 붙여넣으면 공구 기록으로 바꿔주는 도구.
 *
 * 시트에서 표를 복사하면 칸이 탭으로 구분되고, CSV 파일을 열어 붙여넣으면 쉼표로
 * 구분된다. 둘 다 받는다. 칸 순서가 바뀌어도 제목 줄의 글자를 보고 찾아간다.
 */

export type ImportRow = {
  lineNo: number;
  creatorName: string;
  handle: string | null;
  brand: string | null;
  productName: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  settleDueDate: string | null;
  settledAt: string | null;
  revenue: number | null;
  commissionRate: number | null;
  agencyRate: number | null;
  salesCommission: number | null;
  contentFee: number | null;
  settlement: number | null;
  agencyFee: number | null;
  isBusiness: boolean | null;
  linkSent: boolean;
  taxReported: boolean;
  statementIssued: boolean;
  status: "PLANNED" | "ONGOING" | "CLOSED" | "CANCELED";
};

export type ParseResult = {
  rows: ImportRow[];
  skipped: { lineNo: number; reason: string }[];
  unmatchedHeaders: string[];
  /** 이번에 사용한 제목 줄 (다음번에 제목 없이 붙여넣을 때 쓰려고 저장해 둔다) */
  headers: string[];
  /** 저장해 둔 제목 줄을 대신 썼는지 */
  usedSavedHeader: boolean;
};

/** 제목 줄 한 칸을 비교하기 쉽게 다듬는다 (줄바꿈·공백 제거) */
function norm(text: string): string {
  return text.replace(/\s+/g, "").trim();
}

type Field = keyof ImportRow | "settledFlag" | null;

/** 제목 글자를 보고 어떤 항목인지 정한다. 순서가 중요하다 — 좁은 조건이 먼저. */
function fieldOf(header: string): Field {
  const h = norm(header);
  if (!h) return null;

  if (h.includes("링크") && h.includes("전달")) return "linkSent";
  if (h.includes("판매시작") || h === "시작일") return "startDate";
  if (h.includes("판매종료") || h === "종료일") return "endDate";
  if (h.includes("정산예정")) return "settleDueDate";
  if (h.includes("정산완료")) return "settledAt";
  if (h.includes("브랜드")) return "brand";
  if (h.includes("간이지급명세서")) return "statementIssued";
  if (h.includes("세금신고")) return "taxReported";
  if (h.includes("사업자")) return "isBusiness";
  if (h.includes("닉네임")) return "creatorName";
  if (h.includes("매출")) return "revenue";

  // '인플루언서'로 시작하는 칸이 여러 개라 뒷말로 갈라야 한다
  if (h.includes("인플루언서")) {
    if (h.includes("판매수수료")) return "salesCommission";
    if (h.includes("콘텐츠") || h.includes("제작비")) return "contentFee";
    if (h.includes("실지급") || h.includes("정산금")) return "settlement";
    if (h.includes("수수료")) return "commissionRate"; // 인플루언서 수수료(%)
    return "handle"; // '인플루언서' 단독 = 계정 아이디
  }

  // 남은 수수료 칸은 우리 쪽 몫. %인지 금액인지는 값을 보고 가른다.
  if (h.includes("수수료")) return "agencyRate";
  if (h.includes("제품") || h.includes("상품")) return "productName";
  if (h === "정산") return "settledFlag";
  return null;
}

/**
 * 표 전체를 줄 단위로 쪼갠다.
 *
 * 따옴표 안에 줄바꿈이 들어간 칸이 있다(예: 제목이 "인플루언서\n수수료").
 * 그래서 줄바꿈으로 먼저 자르면 안 되고, 처음부터 끝까지 훑으면서 따옴표
 * 안인지 밖인지를 보고 잘라야 한다.
 */
function parseTable(text: string): string[][] {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") {
      cur += c;
    }
  }
  row.push(cur);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** "2025.12.24", "2025-12-24", "2025/12/24" → "2025-12-24". "5월말" 처럼 못 읽는 건 null */
function parseDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseBool(raw: string): boolean {
  const t = norm(raw).toLowerCase();
  return t === "true" || t === "o" || t === "y" || t === "예" || t === "완료" || t === "v";
}

/** 사업자 여부 — 'x'는 사업자가 아니라는 뜻으로 쓰고 있다 */
function parseBusiness(raw: string): boolean | null {
  const t = norm(raw).toLowerCase();
  if (!t) return null;
  if (t === "x" || t === "아니오" || t === "no" || t === "false") return false;
  if (t === "o" || t === "예" || t === "yes" || t === "true" || t.includes("사업자")) return true;
  return null;
}

function parsePercent(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseNumber(t.replace("%", ""));
  return n === null ? null : n;
}

function parseWon(raw: string): number | null {
  const t = raw.replace(/[₩\s]/g, "").trim();
  if (!t) return null;
  const n = parseNumber(t);
  return n === null ? null : Math.round(n);
}

function decideStatus(
  start: string | null,
  end: string | null,
  settledAt: string | null,
  settledFlag: boolean,
  today: Date
): ImportRow["status"] {
  if (settledAt || settledFlag) return "CLOSED";
  const t = today.getTime();
  if (end && new Date(end).getTime() < t) return "CLOSED";
  if (start && new Date(start).getTime() > t) return "PLANNED";
  if (start) return "ONGOING";
  return "PLANNED";
}

export function parseSalesSheet(
  text: string,
  today = new Date(),
  /** 지난번에 성공한 제목 줄. 이번에 제목 없이 내용만 붙여넣었을 때 대신 쓴다. */
  savedHeader?: string[] | null
): ParseResult {
  const table = parseTable(text);

  // 제목 줄 찾기 — '닉네임'이나 '판매 시작'이 들어있는 첫 줄
  let headerIndex = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(table.length, 20); i++) {
    const joined = norm(table[i].join(""));
    if (joined.includes("닉네임") || joined.includes("판매시작") || joined.includes("인플루언서")) {
      headerIndex = i;
      headers = table[i];
      break;
    }
  }
  let usedSavedHeader = false;
  if (headerIndex === -1) {
    // 제목 없이 내용만 붙여넣은 경우 — 지난번 제목 줄을 쓴다.
    // 칸 개수가 똑같을 때만. 다르면 엉뚱한 곳에 값이 들어갈 수 있어 막는다.
    const firstDataRow = table.find((r) => r.some((v) => v.trim()));
    if (savedHeader && firstDataRow && savedHeader.length === firstDataRow.length) {
      headers = savedHeader;
      headerIndex = -1; // 첫 줄부터 내용으로 읽는다
      usedSavedHeader = true;
    } else {
      throw new Error(
        savedHeader
          ? "제목 줄이 없고, 지난번 제목 줄과 칸 개수도 달라서 어디에 넣을지 알 수 없습니다. 제목 줄부터 함께 복사해주세요."
          : "제목 줄을 찾지 못했습니다. 시트에서 '닉네임', '판매 시작' 같은 제목이 있는 줄부터 함께 드래그해서 복사해주세요."
      );
    }
  }

  const fields = headers.map(fieldOf);
  const unmatchedHeaders = headers
    .map((h, i) => (norm(h) && fields[i] === null ? h.replace(/\s+/g, " ").trim() : null))
    .filter((h): h is string => Boolean(h));

  const rows: ImportRow[] = [];
  const skipped: { lineNo: number; reason: string }[] = [];

  for (let i = headerIndex + 1; i < table.length; i++) {
    const cells = table[i];
    if (!cells.some((v) => v.trim())) continue;

    // 같은 이름의 칸이 두 개일 수 있다(예: 우리 수수료가 %와 금액으로 각각)
    const getAll = (f: Field): string[] =>
      fields
        .map((ff, idx) => (ff === f ? (cells[idx] ?? "").trim() : null))
        .filter((v): v is string => v !== null);
    const get = (f: Field): string => getAll(f).find((v) => v !== "") ?? "";

    const creatorName = get("creatorName").trim();
    const handle = get("handle").trim();
    const revenue = parseWon(get("revenue"));
    const start = parseDate(get("startDate"));

    // 이름도 없고 매출도 없으면 시트의 빈 줄이다
    if (!creatorName && !handle) {
      if (revenue || start) skipped.push({ lineNo: i + 1, reason: "인플루언서 이름이 비어 있음" });
      continue;
    }

    const settledFlag = parseBool(get("settledFlag"));
    const settledAt = parseDate(get("settledAt"));
    const end = parseDate(get("endDate"));

    // 우리 수수료는 %와 금액이 각각 다른 칸에 있다. 값 모양을 보고 갈라 담는다.
    const agencyCells = getAll("agencyRate");
    const agencyRateRaw = agencyCells.find((v) => v.includes("%")) ?? "";
    const agencyFeeRaw = agencyCells.find((v) => v && !v.includes("%")) ?? "";

    rows.push({
      lineNo: i + 1,
      creatorName: creatorName || handle,
      handle: handle || null,
      brand: get("brand") || null,
      productName: get("productName") || null,
      startDate: start,
      endDate: end,
      settleDueDate: parseDate(get("settleDueDate")),
      settledAt,
      revenue,
      commissionRate: parsePercent(get("commissionRate")),
      agencyRate: parsePercent(agencyRateRaw),
      salesCommission: parseWon(get("salesCommission")),
      contentFee: parseWon(get("contentFee")),
      settlement: parseWon(get("settlement")),
      agencyFee: parseWon(agencyFeeRaw),
      isBusiness: parseBusiness(get("isBusiness")),
      linkSent: parseBool(get("linkSent")),
      taxReported: parseBool(get("taxReported")),
      statementIssued: parseBool(get("statementIssued")),
      status: decideStatus(start, end, settledAt, settledFlag, today),
    });
  }

  return { rows, skipped, unmatchedHeaders, headers, usedSavedHeader };
}
