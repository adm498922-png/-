import { prisma } from "@/lib/prisma";
import PipelineBoard, { type PipelineCreator } from "./PipelineBoard";

export const dynamic = "force-dynamic";

/** 영업 파이프라인 — 크리에이터를 진행 단계별 칸반 보드로 본다 */
export default async function PipelinePage() {
  const creators = await prisma.creator.findMany({
    orderBy: { createdAt: "desc" },
  });

  const items: PipelineCreator[] = creators.map((c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    platform: c.platform,
    followers: c.followers,
    category: c.category,
    tags: c.tags,
    contactType: c.contactType,
    status: c.status,
    lastContactAt: c.lastContactAt?.toISOString() ?? null,
    statusChangedAt: c.statusChangedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    engagementRate: c.engagementRate,
  }));

  return <PipelineBoard initialItems={items} />;
}
