import { prisma } from "./prisma";
import { getValidAccessToken, markAccountNeedsReconnect } from "./threads-accounts";
import { getDecryptedSettings } from "./settings";
import {
  createTextContainer,
  createImageContainer,
  createVideoContainer,
  createCarouselContainer,
  waitUntilContainerReady,
  publishContainer,
  getMediaPermalink,
  ThreadsApiError,
  isSessionExpiredError,
} from "./threads-api";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** settings.threadsRedirectUri(예: https://.../api/threads/oauth/callback)에서 origin만 추출 */
function getPublicBaseUrl(redirectUri: string): string {
  return redirectUri.replace(/\/api\/threads\/oauth\/callback\/?$/, "");
}

async function publishWithRetry(params: {
  accessToken: string;
  threadsUserId: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  replyToId?: string;
}): Promise<{ mediaId: string }> {
  let containerId: string;

  if (params.imageUrl && params.videoUrl) {
    // 사진 + 영상을 한 게시물에 같이 올리려면 캐러셀로 묶어야 함
    const [imageChild, videoChild] = await Promise.all([
      createImageContainer({
        accessToken: params.accessToken,
        threadsUserId: params.threadsUserId,
        imageUrl: params.imageUrl,
        isCarouselItem: true,
      }),
      createVideoContainer({
        accessToken: params.accessToken,
        threadsUserId: params.threadsUserId,
        videoUrl: params.videoUrl,
        isCarouselItem: true,
      }),
    ]);
    await waitUntilContainerReady({
      accessToken: params.accessToken,
      containerId: videoChild.id,
    });
    const carousel = await createCarouselContainer({
      accessToken: params.accessToken,
      threadsUserId: params.threadsUserId,
      childrenIds: [imageChild.id, videoChild.id],
      text: params.text,
      replyToId: params.replyToId,
    });
    containerId = carousel.id;
  } else if (params.videoUrl) {
    const video = await createVideoContainer({
      accessToken: params.accessToken,
      threadsUserId: params.threadsUserId,
      videoUrl: params.videoUrl,
      text: params.text,
      replyToId: params.replyToId,
    });
    await waitUntilContainerReady({
      accessToken: params.accessToken,
      containerId: video.id,
    });
    containerId = video.id;
  } else if (params.imageUrl) {
    const image = await createImageContainer({
      accessToken: params.accessToken,
      threadsUserId: params.threadsUserId,
      imageUrl: params.imageUrl,
      text: params.text,
      replyToId: params.replyToId,
    });
    containerId = image.id;
  } else {
    const text = await createTextContainer({
      accessToken: params.accessToken,
      threadsUserId: params.threadsUserId,
      text: params.text,
      replyToId: params.replyToId,
    });
    containerId = text.id;
  }

  // Threads 컨테이너는 생성 후 처리에 약간의 시간이 걸릴 수 있어 짧게 재시도
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(2000);
      const published = await publishContainer({
        accessToken: params.accessToken,
        threadsUserId: params.threadsUserId,
        creationId: containerId,
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
    include: {
      post: { include: { coupangLink: true } },
      threadsAccount: true,
    },
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

    let videoUrl: string | undefined;
    if (target.post.coupangLink?.videoStatus === "READY" && target.post.coupangLink.videoUrl) {
      const settings = await getDecryptedSettings();
      if (settings.threadsRedirectUri) {
        videoUrl = `${getPublicBaseUrl(settings.threadsRedirectUri)}${target.post.coupangLink.videoUrl}`;
      }
    }

    const imageUrl = target.post.coupangLink?.imageUrl ?? undefined;
    const text = target.body || target.post.body;

    let mediaId: string;
    try {
      const published = await publishWithRetry({
        accessToken,
        threadsUserId: target.threadsAccount.threadsUserId,
        text,
        imageUrl,
        videoUrl,
      });
      mediaId = published.mediaId;
    } catch (e) {
      if (!videoUrl) throw e;
      // 영상 처리 실패는 사진/글 발행까지 막지 않고, 영상만 빼고 재시도
      console.error("영상 포함 발행 실패, 영상 없이 재시도", describeError(e));
      if (target.post.coupangLinkId) {
        await prisma.coupangLink.update({
          where: { id: target.post.coupangLinkId },
          data: {
            videoStatus: "FAILED",
            videoError: `발행 시 처리 실패로 제외됨: ${describeError(e)}`,
          },
        });
      }
      const published = await publishWithRetry({
        accessToken,
        threadsUserId: target.threadsAccount.threadsUserId,
        text,
        imageUrl,
      });
      mediaId = published.mediaId;
    }

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
