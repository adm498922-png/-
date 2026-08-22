// 공동구매 크리에이터 관리 화면에서 서버·클라이언트가 함께 쓰는 라벨과 계산 함수

export const CREATOR_STATUSES = [
  "LEAD",
  "CONTACTED",
  "CONFIRMED",
  "ONGOING",
  "DONE",
  "HOLD",
  "REJECTED",
] as const;
export type CreatorStatusKey = (typeof CREATOR_STATUSES)[number];

export const CREATOR_STATUS_LABEL: Record<string, string> = {
  LEAD: "후보",
  CONTACTED: "컨택중",
  CONFIRMED: "확정",
  ONGOING: "진행중",
  DONE: "완료",
  HOLD: "보류",
  REJECTED: "거절",
};

// 목록 상단 배지 색. 진행 단계가 뒤로 갈수록 진한 색이 되도록 잡았다.
export const CREATOR_STATUS_CLASS: Record<string, string> = {
  LEAD: "bg-slate-100 text-slate-600",
  CONTACTED: "bg-sky-100 text-sky-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  ONGOING: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-700",
  HOLD: "bg-slate-200 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
};

// 팔로워 수로 매긴 등급 (마이크로/매크로/메가). 저장하는 값이 아니라 그때그때 계산.
export type CreatorGrade = "micro" | "macro" | "mega";

export function getCreatorGrade(followers: number | null | undefined): CreatorGrade {
  const f = followers ?? 0;
  if (f >= 100000) return "mega";
  if (f >= 10000) return "macro";
  return "micro";
}

export const CREATOR_GRADE_LABEL: Record<CreatorGrade, string> = {
  micro: "마이크로",
  macro: "매크로",
  mega: "메가",
};

// 목록 화면 색 점: 이름별로 제각각이던 색 대신 등급별로 통일된 색을 쓴다
export const CREATOR_GRADE_DOT: Record<CreatorGrade, string> = {
  micro: "bg-blue-500",
  macro: "bg-green-500",
  mega: "bg-amber-500",
};

export const CREATOR_GRADE_CLASS: Record<CreatorGrade, string> = {
  micro: "bg-blue-50 text-blue-700",
  macro: "bg-green-50 text-green-700",
  mega: "bg-amber-50 text-amber-700",
};

// 크리에이터별 캘린더 색상. 안 고르면 이름으로 자동 배정해서 계정마다 달라 보이게 한다.
export const CREATOR_COLORS = [
  "rose",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
] as const;
export type CreatorColorKey = (typeof CREATOR_COLORS)[number];

// 하루짜리 항목 칩(연한 배경)
export const CREATOR_COLOR_CHIP: Record<CreatorColorKey, string> = {
  rose: "bg-rose-100 text-rose-700",
  orange: "bg-orange-100 text-orange-700",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-700",
  teal: "bg-teal-100 text-teal-700",
  blue: "bg-blue-100 text-blue-700",
  indigo: "bg-indigo-100 text-indigo-700",
  purple: "bg-purple-100 text-purple-700",
};

// 여러 날 막대(진한 배경)
export const CREATOR_COLOR_BAR: Record<CreatorColorKey, string> = {
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-600",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
};

// 색상 고르기용 스와치(동그라미) 미리보기 배경
export const CREATOR_COLOR_SWATCH: Record<CreatorColorKey, string> = {
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
};

/** 색을 직접 고르지 않았으면 이름 글자로 항상 같은 색이 나오게 계산한다. */
export function autoCreatorColor(name: string): CreatorColorKey {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CREATOR_COLORS[hash % CREATOR_COLORS.length];
}

export function resolveCreatorColor(
  name: string,
  color?: string | null
): CreatorColorKey {
  if (color && (CREATOR_COLORS as readonly string[]).includes(color)) {
    return color as CreatorColorKey;
  }
  return autoCreatorColor(name);
}

export const PLATFORMS = [
  "INSTAGRAM",
  "THREADS",
  "YOUTUBE",
  "TIKTOK",
  "BLOG",
  "BAND",
  "ETC",
] as const;

export const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "인스타그램",
  THREADS: "스레드",
  YOUTUBE: "유튜브",
  TIKTOK: "틱톡",
  BLOG: "블로그",
  BAND: "밴드/카페",
  ETC: "기타",
};

export const CONTACT_TYPES = ["오픈채팅", "DM", "이메일", "전화", "기타"];

export const DEAL_STATUSES = ["PLANNED", "ONGOING", "CLOSED", "CANCELED"] as const;

export const DEAL_STATUS_LABEL: Record<string, string> = {
  PLANNED: "예정",
  ONGOING: "진행중",
  CLOSED: "종료",
  CANCELED: "취소",
};

export const DEAL_STATUS_CLASS: Record<string, string> = {
  PLANNED: "bg-sky-100 text-sky-700",
  ONGOING: "bg-amber-100 text-amber-800",
  CLOSED: "bg-green-100 text-green-700",
  CANCELED: "bg-slate-100 text-slate-500",
};

export function formatWon(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko-KR") + "원";
}

// 12345 → "1.2만", 1234567 → "123만" 처럼 팔로워 수를 짧게 보여준다.
export function formatFollowers(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 10000) {
    const man = value / 10000;
    return (man >= 100 ? Math.round(man) : Math.round(man * 10) / 10) + "만";
  }
  if (value >= 1000) return Math.round(value / 100) / 10 + "천";
  return String(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

// 입력창에 넣을 "YYYY-MM-DD" 문자열
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 사용자가 "1,000,000원", "10만" 처럼 적어도 숫자로 받아들인다.
export function parseNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const raw = String(input).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s원개명%]/g, "");
  const manMatch = cleaned.match(/^([\d.]+)만$/);
  if (manMatch) {
    const n = Number(manMatch[1]);
    return Number.isFinite(n) ? Math.round(n * 10000) : null;
  }
  const cheonMatch = cleaned.match(/^([\d.]+)천$/);
  if (cheonMatch) {
    const n = Number(cheonMatch[1]);
    return Number.isFinite(n) ? Math.round(n * 1000) : null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// 화면(클라이언트 컴포넌트)에서 쓰는 자료 모양.
// 서버에서 JSON으로 넘어오면 날짜가 문자열이 되므로 둘 다 허용한다.
export type DealView = {
  id: string;
  creatorId: string;
  productId: string | null;
  productName: string | null;
  product?: { id: string; name: string } | null;
  status: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  unitsSold: number | null;
  revenue: number | null;
  settlement: number | null;
  commissionRate: number | null;
  salesCommission: number | null;
  contentFee: number | null;
  agencyRate: number | null;
  agencyFee: number | null;
  settleDueDate: string | Date | null;
  settledAt: string | Date | null;
  linkSent: boolean;
  taxReported: boolean;
  statementIssued: boolean;
  memo: string | null;
  createdAt: string | Date;
};

export type CreatorView = {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
  profileUrl: string | null;
  followers: number | null;
  following: number | null;
  category: string | null;
  contactType: string | null;
  contact: string | null;
  feeKrw: number | null;
  commissionRate: number | null;
  status: string;
  rating: number | null;
  tags: string | null;
  memo: string | null;
  color: string | null;
  lastContactAt: string | Date | null;
  isBusiness: boolean | null;
  bio: string | null;
  linkInBio: string | null;
  profileImageUrl: string | null;
  postCount: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  engagementRate: number | null;
  igUserId: string | null;
  syncedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deals: DealView[];
};

// 상품이 지금 어느 단계인지: 소싱중(컨택·미팅) → 공구 가능 → 판매 종료
export const PRODUCT_STATUSES = ["SOURCING", "ACTIVE", "ENDED"] as const;
export type ProductStatusKey = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABEL: Record<string, string> = {
  SOURCING: "소싱중",
  ACTIVE: "공구 가능",
  ENDED: "판매 종료",
};

export const PRODUCT_STATUS_CLASS: Record<string, string> = {
  SOURCING: "bg-sky-100 text-sky-700",
  ACTIVE: "bg-green-500/15 text-green-700",
  ENDED: "bg-slate-100 text-slate-500",
};

export type ProductView = {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  images: string | null;
  retailPrice: number | null;
  supplyPrice: number | null;
  commissionRate: number | null;
  memo: string | null;
  status: string;
  vendorCompany: string | null;
  vendorContact: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
  shippingFee: string | null;
  returnPolicy: string | null;
  asInfo: string | null;
  settlementSchedule: string | null;
  origin: string | null;
  composition: string | null;
  material: string | null;
  sizeWeight: string | null;
  noticeExtra: string | null;
  proposalFileUrl: string | null;
  proposalFileName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deals?: { id: string }[];
};

// 크리에이터 한 명의 누적 성과. 취소된 공구는 빼고 센다.
export function summarizeDeals(deals: DealView[]) {
  const counted = deals.filter((d) => d.status !== "CANCELED");
  const revenue = counted.reduce((sum, d) => sum + (d.revenue ?? 0), 0);
  const settlement = counted.reduce((sum, d) => sum + (d.settlement ?? 0), 0);
  const units = counted.reduce((sum, d) => sum + (d.unitsSold ?? 0), 0);
  const lastDate = counted
    .map((d) => d.endDate ?? d.startDate ?? d.createdAt)
    .filter(Boolean)
    .map((v) => new Date(v as string | Date).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];

  return {
    count: counted.length,
    revenue,
    settlement,
    units,
    lastDealAt: lastDate ? new Date(lastDate) : null,
  };
}

// 참여율 표시. 공구에서는 팔로워 수보다 이 숫자가 실제 판매량에 더 가깝다.
export function formatEngagement(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value}%`;
}

// 참여율 색깔 기준 — 인스타 기준으로 3% 넘으면 좋은 편, 1% 아래면 낮은 편.
export function engagementClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-slate-500";
  if (value >= 3) return "text-green-700";
  if (value >= 1) return "text-amber-700";
  return "text-slate-500";
}

/**
 * 오늘 날짜를 "YYYY-MM-DD"로. 한국 시간 기준.
 *
 * 정산 예정일이 지났는지 같은 판단에 쓴다. 화면 안에서 직접 시계를 읽으면
 * 다시 그릴 때마다 값이 달라지므로, 서버에서 한 번 읽어 화면으로 넘긴다.
 */
export function todayInKorea(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}
