import { parseNumber } from "@/lib/gonggu";
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from "@/lib/campaign";

export function normalizeCampaignInput(input: Record<string, unknown>) {
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
  const date = (key: string) => {
    if (!(key in input)) return undefined;
    const v = input[key];
    if (typeof v !== "string" || !v.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const bool = (key: string) => {
    if (!(key in input)) return undefined;
    return Boolean(input[key]);
  };

  const type =
    typeof input.type === "string" && (CAMPAIGN_TYPES as readonly string[]).includes(input.type)
      ? input.type
      : undefined;
  const status =
    typeof input.status === "string" &&
    (CAMPAIGN_STATUSES as readonly string[]).includes(input.status)
      ? input.status
      : undefined;

  return {
    type,
    brand: text("brand"),
    name: text("name"),
    category: text("category"),
    desc: text("desc"),
    status,

    microTarget: int("microTarget"),
    macroTarget: int("macroTarget"),
    megaTarget: int("megaTarget"),
    budget: int("budget"),
    period: text("period"),
    productShip: bool("productShip"),
    secondaryUse: bool("secondaryUse"),

    salePrice: int("salePrice"),
    listPrice: int("listPrice"),
    commissionRate: "commissionRate" in input ? parseNumber(input.commissionRate) : undefined,
    targetQty: int("targetQty"),
    collabStart: date("collabStart"),
    collabEnd: date("collabEnd"),
    promo: text("promo"),
  };
}
