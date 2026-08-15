import OpenAI from "openai";

const HOOK_MAX_LENGTH = 34;

const STYLE_RULES =
  `2. 첫 줄은 반드시 공백 포함 ${HOOK_MAX_LENGTH}자 이내여야 해. 이 짧은 안에서 최대한 강한 인상을 남겨. ` +
  "글자 수를 넘기면 안 돼. 넘길 것 같으면 문장을 더 잘라내.\n" +
  "3. 그 다음 2~3줄로 짧게 이어가. 문단(줄바꿈)을 자연스럽게 나눠서, 한 호흡에 한 장면씩 읽히게 해 — " +
  "그래야 사람들이 스크롤을 멈추고 다음 줄을 읽으러 머문다.\n" +
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

const DAILY_TONE_INSTRUCTIONS: Record<string, string> = {
  반말: "무조건 반말로 써 (친구한테 말하듯).",
  존댓말: "존댓말로 써. 딱딱한 격식체 말고, 편안하고 친근한 존댓말로.",
  친구처럼: "아주 친한 친구한테 카톡 보내듯 편한 반말로, 줄임말이나 구어체 표현도 자연스럽게 섞어서.",
  담백하게: "반말로 담백하게 써. 과장이나 꾸밈 없이 있는 그대로, 문장도 짧고 건조하게.",
  감성: "반말로 쓰되 감정과 분위기를 느낄 수 있게 조금 더 서정적으로. 문장을 짧게 끊어서 여운을 남겨도 좋아.",
  유쾌: "반말로 유쾌하고 웃기게 써. 위트 있는 드립이나 자기 상황을 웃기게 묘사하는 것도 좋아.",
};

const DAILY_CORE_RULES =
  "이렇게 써:\n" +
  "- 구조를 딱딱 맞추지 마. '오늘 있었던 일 → 느낀 점' 처럼 뻔한 순서 말고, " +
  "생각나는 대로 흘러가듯이, 중간에 딴 얘기로 살짝 샜다가 다시 돌아와도 좋아\n" +
  "- 완벽한 문장보다 사람이 실제로 말하듯 약간 흐트러진 리듬이 좋아. " +
  "쉼표나 줄바꿈으로 숨 쉬듯이 끊어 써도 되고, 한 문장이 길어져도 괜찮아\n" +
  "- 뜬구름 잡는 얘기 말고, 시간·장소·구체적인 대사나 행동 같은 디테일을 넣어서 " +
  "실제로 있었던 일처럼 느껴지게 해\n" +
  "- 첫 줄은 그래도 시선을 끌어야 하는데, 카피라이팅처럼 다듬어진 문장 말고 " +
  "진짜 갑자기 생각나서 툭 내뱉은 것 같은 문장으로 시작해\n" +
  `- 첫 줄은 공백 포함 ${HOOK_MAX_LENGTH}자를 넘기지 마\n` +
  "- 문단(줄바꿈)을 자연스럽게 나눠서 한 호흡에 한 장면씩 읽히게 해 — 그래야 사람들이 스크롤을 " +
  "멈추고 다음 줄을 읽으러 머문다\n" +
  "- 이모지, 느낌표 연속, 해시태그 금지\n" +
  "- 상품 홍보나 판매 얘기는 절대 하지 마 (완전히 다른 목적의 글이야)\n" +
  "- 매번 소재와 흐름을 다르게 써서 뻔한 글처럼 보이지 않게 해\n" +
  "- 길이는 자유롭게 (짧아도 되고, 썰이 길어지면 6~8줄까지도 괜찮아 — " +
  "억지로 줄이려고 부자연스럽게 끊지 마)\n" +
  "- 글 내용만 출력하고 설명이나 따옴표는 붙이지 마.";

function buildDailySystemPrompt(tone: string): string {
  const toneInstruction = DAILY_TONE_INSTRUCTIONS[tone] ?? DAILY_TONE_INSTRUCTIONS["반말"];
  return (
    "너는 스레드(Threads)에 일상 썰을 자주 푸는 사람이야. 팔로워들이 '이 사람 글은 진짜 사람 냄새 난다'고 " +
    "말할 정도로 자연스러운 말투가 특징이야. 이건 광고 글이 아니라 순수한 일상 공감글이고, " +
    "완성된 카피처럼 딱 떨어지게 쓰면 절대 안 돼.\n\n" +
    `말투: ${toneInstruction}\n\n` +
    DAILY_CORE_RULES
  );
}

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

const DRAFT_SEPARATOR = "===";

/**
 * 오늘 실제 날씨/이슈 등을 웹 검색으로 확인해서 반영한 일상글 초안을
 * 서로 다른 느낌으로 여러 개 생성 (사용자가 고르고 수정할 수 있도록)
 */
export async function generateDailyPostDrafts(params: {
  apiKey: string;
  topic?: string;
  category?: string;
  tone?: string;
  timeHint?: string;
  count?: number;
}): Promise<string[]> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const count = params.count ?? 3;
  const tone = params.tone ?? "반말";

  const hints: string[] = [];
  if (params.category) hints.push(`소재 카테고리: ${params.category}`);
  if (params.topic) hints.push(`구체적인 소재/키워드: ${params.topic}`);
  if (params.timeHint) hints.push(`지금 올라갈 시간대 분위기(참고만 하고 억지로 언급하지 않아도 됨): ${params.timeHint}`);
  const hintText =
    hints.length > 0
      ? hints.join("\n")
      : "소재는 네가 자유롭게 정해. 반응 좋을 만한 걸로 골라줘.";

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    instructions:
      buildDailySystemPrompt(tone) +
      "\n\n글을 쓰기 전에 웹 검색으로 소재를 수집해. 오늘 날씨·최근 이슈처럼 시사성 있는 소재면 " +
      "실제 오늘 정보를 확인하고, 그게 아니어도 커뮤니티(네이트판, 에펨코리아, 여성시대, 블라인드, " +
      "디시인사이드 등)나 스레드·X에서 요즘 실제로 사람들이 공감하며 이야기하는 에피소드·밈·화제를 " +
      "검색해서 참고해. 검색 결과를 그대로 베끼거나 요약하지 말고, 거기서 소재나 디테일만 빌려와서 " +
      "완전히 새로운 개인적인 에피소드처럼 다시 써. 검색으로 아무것도 못 건지면 그때는 네가 자유롭게 " +
      "지어내도 돼.",
    input:
      `다음 조건으로 스레드 일상글 초안을 서로 느낌이 다르게 ${count}개 만들어줘.\n` +
      `${hintText}\n\n` +
      `각 초안 사이에는 다른 텍스트 없이 정확히 이 줄만 넣어서 구분해: ${DRAFT_SEPARATOR}`,
    tools: [{ type: "web_search" }],
  });

  const text = response.output_text;
  if (!text) {
    throw new Error("AI가 글을 생성하지 못했습니다.");
  }

  const drafts = text
    .split(DRAFT_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);

  if (drafts.length === 0) {
    throw new Error("AI가 글을 생성하지 못했습니다.");
  }
  return drafts;
}

const FOLLOWUP_COMMENT_SYSTEM_PROMPT =
  "너는 스레드(Threads)에 방금 올린 글에 스스로 첫 댓글(셀프 대댓글)을 다는 사람이야. " +
  "본문을 방금 읽은 사람처럼, 본문에서 실제로 나온 구체적인 단어나 상황을 최소 하나는 언급하면서 " +
  "자연스럽게 이어지는 짧은 댓글을 하나 써. 사람들이 댓글을 달고 싶어지게 질문을 던지거나 " +
  "리액션을 유도해도 좋아.\n" +
  "- 무조건 반말\n" +
  "- 한두 문장, 짧게\n" +
  "- 이모지, 해시태그 금지\n" +
  "- 본문과 무관한 뜬금없는 말 금지 — 반드시 본문 내용에 붙어서 이어지는 댓글이어야 해\n" +
  "- 댓글 내용만 출력하고 설명이나 따옴표는 붙이지 마.";

/** 방금 만든 글 본문을 그대로 이어받아, 본문 내용과 연결되는 셀프 댓글을 하나 생성 (일상글용) */
export async function generateFollowUpComment(params: {
  apiKey: string;
  postBody: string;
}): Promise<string> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FOLLOWUP_COMMENT_SYSTEM_PROMPT },
      { role: "user", content: `방금 올린 글:\n${params.postBody}` },
    ],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("AI가 댓글을 생성하지 못했습니다.");
  }
  return text;
}

const FOLLOWUP_TEASER_SYSTEM_PROMPT =
  "너는 스레드에서 방금 올린 상품 후기 글에 스스로 댓글을 달아 구매 링크로 유도하는 사람이야. " +
  "방금 올린 글에서 실제로 언급한 내용(제품 특징, 상황 등)과 자연스럽게 이어지는 아주 짧은 유도 " +
  "문구를 하나 써 줘. 링크는 네가 붙이지 마, 문구만 써.\n" +
  "- 무조건 반말, 한 문장, 아주 짧게\n" +
  "- 본문과 무관한 뜬금없는 문구 금지 — 본문에서 말한 내용과 이어져야 해\n" +
  "- 이모지, 해시태그, 따옴표 금지, 문구만 출력";

/** 상품 소개 글 본문과 이어지는 짧은 링크 유도 문구를 생성 (댓글의 쿠팡 링크 앞에 붙임) */
export async function generateFollowUpTeaser(params: {
  apiKey: string;
  postBody: string;
}): Promise<string> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FOLLOWUP_TEASER_SYSTEM_PROMPT },
      { role: "user", content: `방금 올린 글:\n${params.postBody}` },
    ],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("AI가 유도 문구를 생성하지 못했습니다.");
  }
  return text;
}

/** 상품 자동 수집용 검색 키워드를 AI가 하나 추천 (직접 검색 없이도 상품 링크를 모을 수 있도록) */
export async function suggestProductKeyword(params: {
  apiKey: string;
  avoid?: string[];
}): Promise<string> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const avoidText =
    params.avoid && params.avoid.length > 0
      ? `다음 상품/키워드는 최근에 이미 다뤘으니 피해줘: ${params.avoid.slice(0, 10).join(", ")}`
      : "쿠팡에서 검색할 인기 상품 키워드 하나 추천해줘.";

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "너는 쿠팡에서 반응 좋을 만한 생활용품·주방·육아·리빙·뷰티·건강 관련 인기 상품 " +
          "검색 키워드를 추천하는 역할이야. 특정 브랜드명이 아니라 '실리콘 주걱', '유아 물티슈' " +
          "처럼 쿠팡 상품 검색창에 그대로 넣을 수 있는 일반적인 상품 키워드를 딱 하나만 출력해. " +
          "설명이나 따옴표 없이 키워드만 출력해.",
      },
      { role: "user", content: avoidText },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("키워드 추천에 실패했습니다.");
  }
  return text.replace(/^["'“”]+|["'“”]+$/g, "");
}

/**
 * 네이버 데이터랩으로 실제 검색 트렌드를 비교할 후보 키워드 여러 개를 추천.
 * (데이터랩 API는 주어진 키워드끼리만 비교해주므로 후보군이 먼저 필요함)
 */
export async function suggestProductKeywordCandidates(params: {
  apiKey: string;
  avoid?: string[];
  count?: number;
}): Promise<string[]> {
  const client = new OpenAI({ apiKey: params.apiKey });
  const count = params.count ?? 6;
  const avoidText =
    params.avoid && params.avoid.length > 0
      ? `다음 상품/키워드는 최근에 이미 다뤘으니 피해줘: ${params.avoid.slice(0, 10).join(", ")}`
      : "";

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "너는 쿠팡에서 반응 좋을 만한 생활용품·주방·육아·리빙·뷰티·건강 관련 인기 상품 " +
          "검색 키워드 후보를 추천하는 역할이야. 특정 브랜드명이 아니라 '실리콘 주걱', " +
          "'유아 물티슈'처럼 쿠팡 상품 검색창에 그대로 넣을 수 있는 일반적인 상품 키워드를 " +
          `서로 다른 카테고리로 정확히 ${count}개 추천해. 한 줄에 하나씩, 번호나 설명 없이 ` +
          "키워드만 출력해.",
      },
      { role: "user", content: avoidText || "쿠팡에서 검색할 인기 상품 키워드 후보들을 추천해줘." },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("키워드 후보 추천에 실패했습니다.");
  }
  const keywords = text
    .split("\n")
    .map((line) => line.replace(/^[\d.\-*)\s]+/, "").trim())
    .map((line) => line.replace(/^["'“”]+|["'“”]+$/g, ""))
    .filter(Boolean);

  if (keywords.length === 0) {
    throw new Error("키워드 후보 추천에 실패했습니다.");
  }
  return keywords;
}
