import { prisma } from "./prisma";
import { publishPost } from "./publish";

export async function runDueScheduledPosts() {
  const now = new Date();
  const duePosts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true },
  });

  const results: { postId: string; ok: boolean; error?: string }[] = [];
  for (const post of duePosts) {
    try {
      await publishPost(post.id);
      results.push({ postId: post.id, ok: true });
    } catch (e) {
      results.push({
        postId: post.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}
