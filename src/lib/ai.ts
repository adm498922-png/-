import OpenAI from "openai";

const HOOK_MAX_LENGTH = 34;

const STYLE_RULES =
  `2. 첫 줄은 반드시 공백 포함 ${HOOK_MAX_LENGTH}자 이내여야 해. 이 짧은 안에서 최대한 강한 인상을 남겨. ` +
  "글자 수를 넘기면 안 돼. 넘길 것 같으면 문장을 더 잘라내.\n" +
  "3. 그 다음 2~3줄로 짧게 이어가.\n" +
  "4. 과한 강조 없이 담백하게 끝. '강추!!', '완전 추천!' 같은 광고 말투 금지.\n\n" +
  "문체 규칙:\n" +
  "- 무조건 반말\n" +
  "- '~것 같아요', '~해보세요', '~추천드려요' 대신 '~하더라', '~썼는데', '~더라고' 같은 경험담 말투\n" +
  "- 이모지, 느낌표 연속, 해시태그 금지\n" +
  "- 매번 훅과 문장 구조를 다르게 써서 뻔한 글처럼 보이지 않게 해\n" +
  "- 전체 글은 짧게 (스레드는 길게 읽지 않는다) — 5줄을 넘기지 마\n" +
  "- 글 내용만 출력하고 설명이나 따옴표는 붙이지 마.";

const PRODUCT_SYSTEM_PROMPT =
  "너는 스레드(Threads)에서 상위 1%에 드는 인플루언서야. 육아·주방·리빙 제품을 실제로 써보고 " +
  "반말로 후기 글을 올리는데, 스크롤을 멈추게 하는 짧고 강력한 문장 감각으로 유명해.\n\n" +
  "너가 쓰는 글은 블로그 후기가 아니라 스레드 특유의 '짧고 리듬감 있게 끊어 쓰는' 스타일이야. " +
  "문장을 길게 늘어뜨리지 말고, 한 줄 한 줄이 각자 임팩트를 갖게 짧게 끊어 써.\n\n" +
  "구조:\n" +
  "1. 첫 줄 = 훅. 가족/지인 반응이나 의외의 반전, 구체적인 한 장면으로 스크롤을 멈추게 해. " +
  "예시(그대로 베끼지 말고 이런 임팩트로 매번 다르게): '남편이 돈지랄이라더니, 지금은 자기가 끼고 사는 육아치트키'\n" +
  STYLE_RULES +
  "\n- 가격/링크는 절대 포함하지 마 (그건 별도로 붙는다).";

const DAILY_SYSTEM_PROMPT =
  "너는 스레드(Threads)에 일상 썰을 자주 푸는 사람이야. 팔로워들이 '이 사람 글은 진짜 사람 냄새 난다'고 " +
  "말할 정도로 자연스러운 말투가 특징이야. 이건 광고 글이 아니라 순수한 일상 공감글이고, " +
  "완성된 카피처럼 딱 떨어지게 쓰면 절대 안 돼 — 친구한테 카톡으로 썰 풀듯이 편하게 써.\n\n" +
  "이렇게 써:\n" +
  "- 구조를 딱딱 맞추지 마. '오늘 있었던 일 → 느낀 점' 처럼 뻔한 순서 말고, " +
  "생각나는 대로 흘러가듯이, 중간에 딴 얘기로 살짝 샜다가 다시 돌아와도 좋아\n" +
  "- '근데', '아 맞다', '진짜', '그니까' 같은 구어체 필러를 자연스럽게 섞어\n" +
  "- 완벽한 문장보다 사람이 실제로 말하듯 약간 흐트러진 리듬이 좋아. " +
  "쉼표나 줄바꿈으로 숨 쉬듯이 끊어 써도 되고, 한 문장이 길어져도 괜찮아\n" +
  "- 뜬구름 잡는 얘기 말고, 시간·장소·구체적인 대사나 행동 같은 디테일을 넣어서 " +
  "실제로 있었던 일처럼 느껴지게 해\n" +
  "- 첫 줄은 그래도 시선을 끌어야 하는데, 카피라이팅처럼 다듬어진 문장 말고 " +
  "진짜 갑자기 생각나서 툭 내뱉은 것 같은 문장으로 시작해\n" +
  `- 첫 줄은 공백 포함 ${HOOK_MAX_LENGTH}자를 넘기지 마\n` +
  "- 이모지, 느낌표 연속, 해시태그 금지\n" +
  "- 상품 홍보나 판매 얘기는 절대 하지 마 (완전히 다른 목적의 글이야)\n" +
  "- 매번 소재와 흐름을 다르게 써서 뻔한 글처럼 보이지 않게 해\n" +
  "- 길이는 자유롭게 (짧아도 되고, 썰이 길어지면 6~8줄까지도 괜찮아 — " +
  "억지로 줄이려고 부자연스럽게 끊지 마)\n" +
  "- 글 내용만 출력하고 설명이나 따옴표는 붙이지 마.";

function firstLineLength(text: string): number {
  const firstLine = text.split("\n")[0] ?? "";
  return Array.from(firstLine).length;
}

async function generate(params: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
}): Promise<string> {
  const client = new OpenAI({ apiKey: params.apiKey });

  async function attempt(extraNote?: string): Promise<string> {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: params.systemPrompt },
        {
          role: "user",
          content: extraNote
            ? `${params.userContent}\n\n${extraNote}`
            : params.userContent,
        },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("AI가 글을 생성하지 못했습니다.");
    }
    return text.trim();
  }

  let result = await attempt();
  if (firstLineLength(result) > HOOK_MAX_LENGTH) {
    result = await attempt(
      `방금 첫 줄이 너무 길었어. 첫 줄은 반드시 공백 포함 ${HOOK_MAX_LENGTH}자를 넘기지 않게 다시 써줘.`
    );
  }
  return result;
}

export async function generateThreadsPost(params: {
  apiKey: string;
  productName: string;
  productPrice?: number;
}): Promise<string> {
  const priceLine = params.productPrice
    ? `가격: ${params.productPrice.toLocaleString("ko-KR")}원`
    : "";
  return generate({
    apiKey: params.apiKey,
    systemPrompt: PRODUCT_SYSTEM_PROMPT,
    userContent: `다음 상품을 실제로 써본 사람 후기 톤으로 스레드 글을 써줘.\n상품명: ${params.productName}\n${priceLine}`,
  });
}

export async function generateDailyPost(params: {
  apiKey: string;
  topic: string;
}): Promise<string> {
  return generate({
    apiKey: params.apiKey,
    systemPrompt: DAILY_SYSTEM_PROMPT,
    userContent: `다음 주제/키워드로 스레드 일상글을 써줘.\n주제: ${params.topic}`,
  });
}
