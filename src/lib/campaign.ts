// 캠페인(광고/공구협업) 화면에서 서버·클라이언트가 함께 쓰는 라벨과 타입

export const CAMPAIGN_TYPES = ["AD", "COLLAB"] as const;
export type CampaignTypeKey = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  AD: "광고 캠페인",
  COLLAB: "공구/협업",
};

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED"] as const;
export type CampaignStatusKey = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "준비 중",
  ACTIVE: "진행 중",
  COMPLETED: "완료",
};

export const CAMPAIGN_STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export const DM_SEND_STATUSES = ["PENDING", "SENT"] as const;

export type CampaignAssignmentView = {
  id: string;
  campaignId: string;
  creatorId: string;
  status: "PENDING" | "SENT";
  sentAt: string | Date | null;
  createdAt: string | Date;
  creator?: {
    id: string;
    name: string;
    handle: string | null;
    followers: number | null;
    postCount: number | null;
    category: string | null;
    engagementRate: number | null;
  };
};

export type CampaignView = {
  id: string;
  type: "AD" | "COLLAB";
  brand: string;
  name: string;
  category: string | null;
  desc: string | null;
  microTarget: number | null;
  macroTarget: number | null;
  megaTarget: number | null;
  budget: number | null;
  period: string | null;
  productShip: boolean | null;
  secondaryUse: boolean | null;
  salePrice: number | null;
  listPrice: number | null;
  commissionRate: number | null;
  targetQty: number | null;
  collabStart: string | Date | null;
  collabEnd: string | Date | null;
  promo: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  createdAt: string | Date;
  updatedAt: string | Date;
  assignments?: CampaignAssignmentView[];
};

export function campaignTargetTotal(c: CampaignView): number {
  return (c.microTarget ?? 0) + (c.macroTarget ?? 0) + (c.megaTarget ?? 0);
}

export function campaignSummaryLine(c: CampaignView): string {
  const bits: string[] = [];
  if (c.type === "AD") {
    if (c.budget) bits.push(`예산 ${c.budget.toLocaleString("ko-KR")}원`);
    const total = campaignTargetTotal(c);
    if (total) {
      bits.push(
        `목표 ${total}명 (마이크로 ${c.microTarget ?? 0}·매크로 ${c.macroTarget ?? 0}·메가 ${c.megaTarget ?? 0})`
      );
    }
    if (c.period) bits.push(c.period);
  } else {
    if (c.salePrice) bits.push(`판매가 ${c.salePrice.toLocaleString("ko-KR")}원`);
    if (c.commissionRate) bits.push(`수수료 ${c.commissionRate}%`);
    if (c.targetQty) bits.push(`목표 ${c.targetQty.toLocaleString("ko-KR")}개`);
  }
  return bits.join(" · ");
}
