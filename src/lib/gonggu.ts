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
  category: string | null;
  contactType: string | null;
  contact: string | null;
  feeKrw: number | null;
  commissionRate: number | null;
  status: string;
  rating: number | null;
  tags: string | null;
  memo: string | null;
  lastContactAt: string | Date | null;
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

export type ProductView = {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  retailPrice: number | null;
  supplyPrice: number | null;
  commissionRate: number | null;
  memo: string | null;
  isActive: boolean;
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
