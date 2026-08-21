import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidesGonggu } from "@/lib/app-mode";
import type { CampaignView } from "@/lib/campaign";
import DmQueuePanel from "./DmQueuePanel";

export const dynamic = "force-dynamic";

export default async function DmQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (hidesGonggu()) redirect("/");
  const params = await searchParams;
  const campaignParam = params.campaign;
  const selectedCampaignId = typeof campaignParam === "string" ? campaignParam : "";

  const [campaignOptions, templates, selectedCampaign] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, brand: true, type: true },
    }),
    prisma.dmTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    selectedCampaignId
      ? prisma.campaign.findUnique({
          where: { id: selectedCampaignId },
          include: { assignments: { include: { creator: true }, orderBy: { createdAt: "asc" } } },
        })
      : null,
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">DM 발송</h1>
      <p className="mb-6 text-sm text-slate-500">
        캠페인에 배정된 크리에이터에게 한 명씩 메시지를 복사해 인스타 DM 창을 열고, 직접
        붙여넣어 보낸 뒤 완료 처리합니다. (인스타그램 정책상 자동 발송은 하지 않습니다)
      </p>
      <DmQueuePanel
        key={selectedCampaignId || "none"}
        campaignOptions={campaignOptions}
        templates={templates}
        selectedCampaign={selectedCampaign as unknown as CampaignView | null}
      />
    </div>
  );
}
