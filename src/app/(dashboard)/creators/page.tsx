import { prisma } from "@/lib/prisma";
import CreatorList from "./CreatorList";
import type { CreatorView } from "@/lib/gonggu";

export const dynamic = "force-dynamic";

export default async function CreatorsPage() {
  const creators = await prisma.creator.findMany({
    orderBy: { updatedAt: "desc" },
    include: { deals: true },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-white">공구 크리에이터</h1>
      <p className="mb-6 text-sm text-neutral-400">
        공동구매를 함께할 크리에이터를 한곳에 모아두고, 어디까지 이야기가
        진행됐는지와 실제 성과를 기록합니다.
      </p>
      <CreatorList initialCreators={creators as unknown as CreatorView[]} />
    </div>
  );
}
