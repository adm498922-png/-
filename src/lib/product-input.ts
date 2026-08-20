import { parseNumber } from "@/lib/gonggu";

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
    memo: text("memo"),
    retailPrice: int("retailPrice"),
    supplyPrice: int("supplyPrice"),
    commissionRate:
      "commissionRate" in input ? parseNumber(input.commissionRate) : undefined,
    isActive: typeof input.isActive === "boolean" ? input.isActive : undefined,
  };
}
