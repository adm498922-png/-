import OpenAI from "openai";
import { prisma } from "./prisma";
import { saveVideoFile, videoRoutePath, generateVideoFileId } from "./media-storage";

/**
 * 실제 촬영한 것처럼 위장하지 않는, "광고/편집 영상"임이 자연스러운 상품 홍보
 * 영상을 만들도록 프롬프트를 고정한다. (진짜 사용 후기인 척하는 영상은 만들지 않음)
 */
function buildVideoPrompt(productName: string): string {
  return (
    `${productName} 제품을 보여주는 8초짜리 상품 홍보 영상. ` +
    "밝고 깔끔한 스튜디오 배경에서 제품이 부드럽게 회전하거나 클로즈업되는 장면. " +
    "광고/브랜드 홍보 영상 느낌으로, 실제 사람이 손에 들고 찍은 브이로그나 " +
    "리얼 촬영물처럼 보이지 않게 만들어줘. 텍스트나 자막은 넣지 마."
  );
}

/** 영상 생성 요청을 시작하고 job id를 저장 (완료까지는 몇 분 걸림 — 별도 폴링에서 처리) */
export async function requestProductVideo(params: {
  apiKey: string;
  linkId: string;
  productName: string;
  imageUrl: string;
}): Promise<{ jobId: string }> {
  const client = new OpenAI({ apiKey: params.apiKey });
  // Sora의 input_reference는 이미지 크기가 요청 해상도와 정확히 일치해야 해서
  // (쿠팡 상품 이미지는 크기가 제각각) 참조 이미지 없이 텍스트 프롬프트만으로 생성한다.
  const video = await client.videos.create({
    model: "sora-2",
    prompt: buildVideoPrompt(params.productName),
    size: "720x1280",
    seconds: "8",
  });

  await prisma.coupangLink.update({
    where: { id: params.linkId },
    data: {
      videoStatus: "GENERATING",
      videoJobId: video.id,
      videoUrl: null,
      videoError: null,
    },
  });

  return { jobId: video.id };
}

/** 진행 중인 영상 생성 작업들을 확인해서, 끝났으면 다운로드해 저장하고 실패했으면 상태를 남김 */
export async function pollPendingVideoJobs(apiKey: string | null): Promise<void> {
  if (!apiKey) return;

  const pending = await prisma.coupangLink.findMany({
    where: { videoStatus: "GENERATING", videoJobId: { not: null } },
  });
  if (pending.length === 0) return;

  const client = new OpenAI({ apiKey });

  for (const link of pending) {
    if (!link.videoJobId) continue;
    try {
      const video = await client.videos.retrieve(link.videoJobId);

      if (video.status === "completed") {
        const content = await client.videos.downloadContent(link.videoJobId);
        const buffer = Buffer.from(await content.arrayBuffer());
        const fileId = generateVideoFileId(link.id);
        saveVideoFile(fileId, buffer);
        await prisma.coupangLink.update({
          where: { id: link.id },
          data: {
            videoStatus: "READY",
            videoUrl: videoRoutePath(fileId),
            videoJobId: null,
            videoError: null,
          },
        });
      } else if (video.status === "failed") {
        await prisma.coupangLink.update({
          where: { id: link.id },
          data: {
            videoStatus: "FAILED",
            videoJobId: null,
            videoError: video.error?.message ?? "영상 생성에 실패했습니다.",
          },
        });
      }
      // queued / in_progress: 다음 폴링에서 다시 확인
    } catch (e) {
      console.error("영상 생성 상태 확인 실패", link.id, e);
      await prisma.coupangLink.update({
        where: { id: link.id },
        data: {
          videoStatus: "FAILED",
          videoJobId: null,
          videoError: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}
