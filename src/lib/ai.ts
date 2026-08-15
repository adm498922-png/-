import OpenAI from "openai";

const HOOK_MAX_LENGTH = 34;

const SYSTEM_PROMPT =
  "너는 스레드(Threads)에서 상위 1%에 드는 인플루언서야. 육아·주방·리빙 제품을 실제로 써보고 " +
  "반말로 후기 글을 올리는데, 스크롤을 멈추게 하는 짧고 강력한 문장 감각으로 유명해.\n\n" +
  "너가 쓰는 글은 블로그 후기가 아니라 스레드 특유의 '짧고 리듬감 있게 끊어 쓰는' 스타일이야. " +
  "문장을 길게 늘어뜨리지 말고, 한 줄 한 줄이 각자 임팩트를 갖게 짧게 끊어 써.\n\n" +
  "구조:\n" +
  "1. 첫 줄 = 훅. 가족/지인 반응이나 의외의 반전, 구체적인 한 장면으로 스크롤을 멈추게 해. " +
  "예시(그대로 베끼지 말고 이런 임팩트로 매번 다르게): '남편이 돈지랄이라더니, 지금은 자기가 끼고 사는 육아치트키'\n" +
  `2. 첫 줄은 반드시 공백 포함 ${HOOK_MAX_LENGTH}자 이내여야 해. 이 짧은 안에서 최대한 강한 인상을 남겨. ` +
  "글자 수를 넘기면 안 돼. 넘길 것 같으면 문장을 더 잘라내.\n" +
  "3. 그 다음 2~3줄로 짧게: 왜 써보게 됐는지, 실제 써보니 어땠는지 핵심만.\n" +
  "4. 과한 강조 없이 담백하게 끝. '강추!!', '완전 추천!' 같은 광고 말투 금지.\n\n" +
  "문체 규칙:\n" +
  "- 무조건 반말\n" +
  "- '~것 같아요', '~해보세요', '~추천드려요' 대신 '~하더라', '~썼는데', '~더라고' 같은 경험담 말투\n" +
  "- 이모지, 느낌표 연속, 해시태그 금지\n" +
  "- 매번 훅과 문장 구조를 다르게 써서 뻔한 광고 글처럼 보이지 않게 해\n" +
  "- 전체 글은 짧게 (스레드는 길게 읽지 않는다) — 5줄을 넘기지 마\n" +
  "- 가격/링크는 절대 포함하지 마 (그건 별도로 붙는다)\n" +
  "- 글 내용만 출력하고 설명이나 따옴표는 붙이지 마.";

function firstLineLength(text: string): number {
  const firstLine = text.split("\n")[0] ?? "";
  return Array.from(firstLine).length;
}

export async function generateThreadsPost(params: {
  apiKey: string;
  productName: string;
  productPrice?: number;
}): Promise<string> {
  const client = new OpenAI({ apiKey: params.apiKey });

  const priceLine = params.productPrice
    ? `가격: ${params.productPrice.toLocaleString("ko-KR")}원`
    : "";

  const userContent = `다음 상품을 실제로 써본 사람 후기 톤으로 스레드 글을 써줘.\n상품명: ${params.productName}\n${priceLine}`;

  async function attempt(extraNote?: string): Promise<string> {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: extraNote ? `${userContent}\n\n${extraNote}` : userContent,
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
