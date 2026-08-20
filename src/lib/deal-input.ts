import { DEAL_STATUSES, parseNumber } from "@/lib/gonggu";

// 공구 1건(Deal) 입력값 정리. 날짜는 "YYYY-MM-DD" 문자열로 들어온다.
export function normalizeDealInput(input: Record<string, unknown>) {
  const text = (key: string) => {
    const v = input[key];
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  };
  const date = (key: string) => {
    const v = input[key];
    if (typeof v !== "string") return undefined;
    if (!v.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const int = (key: string) => {
    if (!(key in input)) return undefined;
    const n = parseNumber(input[key]);
    return n === null ? null : Math.round(n);
  };

  const bool = (key: string) =>
    typeof input[key] === "boolean" ? (input[key] as boolean) : undefined;

  const status =
    typeof input.status === "string" &&
    (DEAL_STATUSES as readonly string[]).includes(input.status)
      ? input.status
      : undefined;

  return {
    productId: text("productId"),
    productName: text("productName"),
    memo: text("memo"),
    status,
    startDate: date("startDate"),
    endDate: date("endDate"),
    unitsSold: int("unitsSold"),
    revenue: int("revenue"),
    settlement: int("settlement"),
    salesCommission: int("salesCommission"),
    contentFee: int("contentFee"),
    agencyFee: int("agencyFee"),
    commissionRate: "commissionRate" in input ? parseNumber(input.commissionRate) : undefined,
    agencyRate: "agencyRate" in input ? parseNumber(input.agencyRate) : undefined,
    settleDueDate: date("settleDueDate"),
    settledAt: date("settledAt"),
    linkSent: bool("linkSent"),
    taxReported: bool("taxReported"),
    statementIssued: bool("statementIssued"),
  };
}
