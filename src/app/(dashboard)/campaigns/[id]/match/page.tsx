import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hidesGonggu } from "@/lib/app-mode";
import { CAMPAIGN_TYPE_LABEL, campaignSummaryLine, type CampaignView } from "@/lib/campaign";
import type { CreatorView } from "@/lib/gonggu";
import MatchPanel from "./MatchPanel";

export const dynamic = "force-dynamic";

export default async function CampaignMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (hidesGonggu()) redirect("/");
  const { id } = await params;

  const [campaign, creators] = await Promise.all([
    prisma.campaign.findUnique({ where: { id }, include: { assignments: true } }),
    prisma.creator.findMany({ orderBy: { updatedAt: "desc" }, include: { deals: true } }),
  ]);
  if (!campaign) notFound();

  return (
    <div className="max-w-5xl">
      <Link href="/campaigns" className="mb-3 inline-block text-xs text-slate-500 hover:text-slate-800">
        ← 캠페인 목록
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        {CAMPAIGN_TYPE_LABEL[campaign.type]} 매칭 — {campaign.name}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {campaign.brand}
        {campaignSummaryLine(campaign as unknown as CampaignView)
          ? ` · ${campaignSummaryLine(campaign as unknown as CampaignView)}`
          : ""}
      </p>
      <MatchPanel
        campaign={campaign as unknown as CampaignView}
        initialCreators={creators as unknown as CreatorView[]}
      />
    </div>
  );
}
