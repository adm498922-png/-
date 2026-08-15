import { prisma } from "./prisma";
import { getValidAccessToken, markAccountNeedsReconnect } from "./threads-accounts";
import {
  createTextContainer,
  publishContainer,
  getMediaPermalink,
  ThreadsApiError,
  isSessionExpiredError,
} from "./threads-api";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishWithRetry(params: {
  accessToken: string;
  threadsUserId: string;
  text: string;
  replyToId?: string;
}): Promise<{ mediaId: string }> {
  const container = await createTextContainer({
    accessToken: params.accessToken,
    threadsUserId: params.threadsUserId,
    text: params.text,
    replyToId: params.replyToId,
  });

  // Threads 컨테이너는 생성 후 처리에 약간의 시간이 걸릴 수 있어 짧게 재시도
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(2000);
      const published = await publishContainer({
        accessToken: params.accessToken,
        threadsUserId: params.threadsUserId,
        creationId: container.id,
      });
      return { mediaId: published.id };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** 하나의 PostTarget(특정 계정에 대한 발행)을 처리 */
export async function publishTarget(targetId: string) {
  const target = await prisma.postTarget.findUniqueOrThrow({
    where: { id: targetId },
    include: { post: true, threadsAccount: true },
  });

  if (target.status === "PUBLISHED" || target.status === "DONE") {
    return target;
  }

  try {
    await prisma.postTarget.update({
      where: { id: targetId },
      data: { status: "PUBLISHING", errorMessage: null },
    });

    const accessToken = await getValidAccessToken(target.threadsAccountId);
    const { mediaId } = await publishWithRetry({
      accessToken,
      threadsUserId: target.threadsAccount.threadsUserId,
      text: target.body || target.post.body,
    });

    let permalink: string | undefined;
    try {
      const permalinkRes = await getMediaPermalink({ accessToken, mediaId });
      permalink = permalinkRes.permalink;
    } catch {
      // 퍼머링크 조회 실패는 치명적이지 않음
    }

    await prisma.postTarget.update({
      where: { id: targetId },
      data: {
        status: target.post.commentBody ? "COMMENTING" : "DONE",
        threadsMediaId: mediaId,
        threadsPermalink: permalink,
        publishedAt: new Date(),
      },
    });

    if (target.post.commentBody) {
      try {
        const { mediaId: commentMediaId } = await publishWithRetry({
          accessToken,
          threadsUserId: target.threadsAccount.threadsUserId,
          text: target.post.commentBody,
          replyToId: mediaId,
        });
        await prisma.postTarget.update({
          where: { id: targetId },
          data: { status: "DONE", commentMediaId },
        });
      } catch (e) {
        // 본문 발행은 성공했으므로 DONE 처리하되 댓글 실패 메시지만 남김
        await prisma.postTarget.update({
          where: { id: targetId },
          data: {
            status: "DONE",
            errorMessage: `본문은 발행됨, 댓글 등록 실패: ${describeError(e)}`,
          },
        });
      }
    }
  } catch (e) {
    if (isSessionExpiredError(e)) {
      await markAccountNeedsReconnect(target.threadsAccountId);
      await prisma.postTarget.update({
        where: { id: targetId },
        data: {
          status: "FAILED",
          errorMessage: "계정 세션이 만료되어 재연결이 필요합니다. 스레드 계정 화면에서 다시 연결해주세요.",
        },
      });
    } else {
      await prisma.postTarget.update({
        where: { id: targetId },
        data: { status: "FAILED", errorMessage: describeError(e) },
      });
    }
  }

  return prisma.postTarget.findUniqueOrThrow({ where: { id: targetId } });
}

function describeError(e: unknown): string {
  if (e instanceof ThreadsApiError) {
    return `${e.message}: ${JSON.stringify(e.body).slice(0, 300)}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

/** Post에 속한 모든 대상 계정에 순차 발행 */
export async function publishPost(postId: string) {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: { targets: true },
  });

  await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHING" },
  });

  for (const target of post.targets) {
    await publishTarget(target.id);
  }

  const finalTargets = await prisma.postTarget.findMany({
    where: { postId },
  });
  const allDone = finalTargets.every((t) => t.status === "DONE");
  const anyFailed = finalTargets.some((t) => t.status === "FAILED");

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: anyFailed && !allDone ? "FAILED" : "PUBLISHED",
    },
  });

  return finalTargets;
}
