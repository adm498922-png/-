import { prisma } from "./prisma";
import { getDecryptedSettings } from "./settings";
import { generateDailyPostDrafts } from "./ai";
import { TOPIC_CATEGORIES, TONE_OPTIONS, ENGAGEMENT_PROMPTS } from "./daily-post-options";

const REVIEW_WINDOW_HOURS = 3;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 매일 자동으로 소재·말투를 스스로 골라 일상글 초안을 만들고,
 * 사람이 확인할 수 있도록 몇 시간 뒤로 예약해둔다 (즉시 발행하지 않음).
 */
export async function generateAndScheduleDailyPost() {
  const settings = await getDecryptedSettings();
  if (!settings.autoDailyPostEnabled) {
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

  const scheduledAt = new Date(Date.now() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000);

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

  return { created: post.id, category, tone, scheduledAt };
}
