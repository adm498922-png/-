import Anthropic from "@anthropic-ai/sdk";

export async function generateThreadsPost(params: {
  apiKey: string;
  productName: string;
  productPrice?: number;
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const priceLine = params.productPrice
    ? `가격: ${params.productPrice.toLocaleString("ko-KR")}원`
    : "";

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    system:
      "너는 스레드(Threads)에서 육아·주방·리빙 제품을 실제로 써보고 반말로 후기 글을 올리는 사람이야. " +
      "광고 카피가 아니라, 친구한테 얘기하듯 쓰는 진짜 사용 후기처럼 써야 해.\n\n" +
      "글 구조 (참고용 흐름이지 형식을 그대로 따라하지는 마):\n" +
      "1. 첫 문장은 스크롤을 멈추게 하는 '한 줄 훅'. 가족/지인의 반응이나 의외의 반전, " +
      "구체적인 상황 묘사로 시작해. 예시(그대로 베끼지 말고 이런 결의 훅을 매번 다르게 만들어): " +
      "'남편이 돈지랄이라더니, 지금은 자기가 끼고 사는 육아치트키'\n" +
      "2. 왜 사게 됐는지, 처음엔 반신반의했던 마음을 짧게\n" +
      "3. 실제 써보니 어땠는지 구체적인 디테일 (몇 번째 써봤는지, 어떤 상황에서 유용했는지 등)\n" +
      "4. 담백하게 마무리 (과한 강조나 '강추!!', '완전 추천!' 같은 광고 말투 금지)\n\n" +
      "문체 규칙:\n" +
      "- 무조건 반말로 쓴다 (친구한테 말하듯)\n" +
      "- '~것 같아요', '~해보세요', '~추천드려요' 같은 블로그/광고 말투 대신 " +
      "'~하더라', '~썼는데', '~더라고' 같은 실제 경험담 말투를 써\n" +
      "- 이모지, 느낌표 연속 사용, 해시태그 금지\n" +
      "- 매번 훅과 문장 구조를 다르게 써서 뻔한 광고 글처럼 보이지 않게 해\n" +
      "- 가격/링크는 절대 포함하지 마 (그건 별도로 붙는다)\n" +
      "- 3~6문장, 글 내용만 출력하고 설명이나 따옴표는 붙이지 마.",
    messages: [
      {
        role: "user",
        content: `다음 상품을 실제로 써본 사람 후기 톤으로 스레드 글을 써줘.\n상품명: ${params.productName}\n${priceLine}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI가 글을 생성하지 못했습니다.");
  }
  return textBlock.text.trim();
}
