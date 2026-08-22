import { parseNumber, PRODUCT_STATUSES } from "@/lib/gonggu";

export function normalizeProductInput(input: Record<string, unknown>) {
  const text = (key: string) => {
    const v = input[key];
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  };
  const int = (key: string) => {
    if (!(key in input)) return undefined;
    const n = parseNumber(input[key]);
    return n === null ? null : Math.round(n);
  };

  return {
    name: text("name"),
    brand: text("brand"),
    imageUrl: text("imageUrl"),
    images: text("images"),
    memo: text("memo"),
    retailPrice: int("retailPrice"),
    supplyPrice: int("supplyPrice"),
    commissionRate:
      "commissionRate" in input ? parseNumber(input.commissionRate) : undefined,
    status:
      typeof input.status === "string" &&
      (PRODUCT_STATUSES as readonly string[]).includes(input.status)
        ? input.status
        : undefined,

    // 업체 제안서에서 가져온 항목들
    vendorCompany: text("vendorCompany"),
    vendorContact: text("vendorContact"),
    vendorPhone: text("vendorPhone"),
    vendorEmail: text("vendorEmail"),
    shippingFee: text("shippingFee"),
    returnPolicy: text("returnPolicy"),
    asInfo: text("asInfo"),
    settlementSchedule: text("settlementSchedule"),
    origin: text("origin"),
    composition: text("composition"),
    material: text("material"),
    sizeWeight: text("sizeWeight"),
    noticeExtra: text("noticeExtra"),
    proposalFileUrl: text("proposalFileUrl"),
    proposalFileName: text("proposalFileName"),
  };
}
