import { prisma } from "./prisma";
import { getDecryptedSettings } from "./settings";
import { generateDailyPostDrafts, generateThreadsPost } from "./ai";
import {
  TOPIC_CATEGORIES,
  TONE_OPTIONS,
  ENGAGEMENT_PROMPTS,
  buildCoupangComment,
} from "./daily-post-options";

const REVIEW_WINDOW_HOURS = 3;
const PRODUCT_POST_CHANCE = 0.3; // 켜져 있을 때 상품 글이 나올 확률 (나머지는 일상글)

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type AutoDailyPostSkipReason =
  | "disabled"
  | "no-openai-key"
  | "no-active-accounts";

export type AutoDailyPostResult =
  | { skipped: AutoDailyPostSkipReason }
  | {
      created: string;
      kind: "daily" | "product";
      category: string;
      tone?: string;
      scheduledAt: Date;
    };

/**
 * 매일 자동으로 소재·말투를 스스로 골라 글 초안을 만들고,
 * 사람이 확인할 수 있도록 몇 시간 뒤로 예약해둔다 (즉시 발행하지 않음).
 * 설정에 따라 가끔(기본 30%) 이미 저장된 쿠팡 링크로 상품 소개 글을 섞는다.
 */
export async function generateAndScheduleDailyPost(
  options?: { force?: boolean }
): Promise<AutoDailyPostResult> {
  const settings = await getDecryptedSettings();
  if (!settings.autoDailyPostEnabled && !options?.force) {
    return { skipped: "disabled" as const };
  }
  if (!settings.openaiApiKey) {
    return { skipped: "no-openai-key" as const };
  }

  const accounts = await prisma.threadsAccount.findMany({
    where: { isActive: true },
  });
  if (accounts.length === 0) {
    return { skipped: "no-active-accounts" as const };
  }

  const scheduledAt = new Date(Date.now() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000);

  let existingLink = null;
  if (settings.autoDailyPostIncludeProducts && Math.random() < PRODUCT_POST_CHANCE) {
    const links = await prisma.coupangLink.findMany({ take: 100 });
    if (links.length > 0) existingLink = pickRandom(links);
  }

  if (existingLink) {
    const body = await generateThreadsPost({
      apiKey: settings.openaiApiKey,
      productName: existingLink.productName ?? existingLink.originalUrl,
    });
    const commentBody = buildCoupangComment(
      existingLink.shortUrl,
      pickRandom(ENGAGEMENT_PROMPTS)
    );

    const post = await prisma.post.create({
      data: {
        body,
        commentBody,
        coupangLinkId: existingLink.id,
        status: "SCHEDULED",
        scheduledAt,
        targets: {
          create: accounts.map((a) => ({ threadsAccountId: a.id })),
        },
      },
    });

    return {
      created: post.id,
      kind: "product",
      category: existingLink.productName ?? "쿠팡 상품",
      scheduledAt,
    };
  }

  const category = pickRandom(TOPIC_CATEGORIES);
  const tone = pickRandom(TONE_OPTIONS);

  const drafts = await generateDailyPostDrafts({
    apiKey: settings.openaiApiKey,
    category,
    tone,
    count: 1,
  });
  const body = drafts[0];
  const commentBody = pickRandom(ENGAGEMENT_PROMPTS);

  const post = await prisma.post.create({
    data: {
      body,
      commentBody,
      status: "SCHEDULED",
      scheduledAt,
      targets: {
        create: accounts.map((a) => ({ threadsAccountId: a.id })),
      },
    },
  });

  return { created: post.id, kind: "daily", category, tone, scheduledAt };
}
