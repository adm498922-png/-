import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidesGonggu } from "@/lib/app-mode";
import CampaignList from "./CampaignList";
import type { CampaignView } from "@/lib/campaign";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  if (hidesGonggu()) redirect("/");

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignments: true },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">캠페인</h1>
      <p className="mb-6 text-sm text-slate-500">
        광고 캠페인이나 공구/협업 건을 만들고, 크리에이터를 배정해서 DM으로 제안합니다.
      </p>
      <CampaignList initialCampaigns={campaigns as unknown as CampaignView[]} />
    </div>
  );
}
