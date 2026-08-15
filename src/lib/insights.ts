import { prisma } from "./prisma";
import { getValidAccessToken, markAccountNeedsReconnect } from "./threads-accounts";
import { getMediaInsights, isSessionExpiredError } from "./threads-api";

/** 최근 발행된 게시물들의 조회수/좋아요 등을 수집해 스냅샷으로 저장 */
export async function collectInsightsForPublishedTargets() {
  const targets = await prisma.postTarget.findMany({
    where: {
      threadsMediaId: { not: null },
      status: "DONE",
      threadsAccount: { isActive: true },
    },
    orderBy: { publishedAt: "desc" },
    take: 300,
  });

  let succeeded = 0;
  let failed = 0;
  const reconnectNeededAccountIds = new Set<string>();

  for (const target of targets) {
    if (reconnectNeededAccountIds.has(target.threadsAccountId)) {
      failed++;
      continue;
    }
    try {
      const accessToken = await getValidAccessToken(target.threadsAccountId);
      const insights = await getMediaInsights({
        accessToken,
        mediaId: target.threadsMediaId!,
      });
      await prisma.postStat.create({
        data: {
          postTargetId: target.id,
          views: insights.views,
          likes: insights.likes,
          replies: insights.replies,
          reposts: insights.reposts,
          quotes: insights.quotes,
        },
      });
      succeeded++;
    } catch (e) {
      console.error("인사이트 수집 실패", target.id, e);
      if (isSessionExpiredError(e)) {
        reconnectNeededAccountIds.add(target.threadsAccountId);
        await markAccountNeedsReconnect(target.threadsAccountId);
      }
      failed++;
    }
  }

  return { succeeded, failed, total: targets.length };
}
