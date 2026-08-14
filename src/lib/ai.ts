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
      "너는 육아·주방·리빙 제품을 소개하는 스레드(Threads) 인플루언서 계정의 글을 대신 써주는 도우미야. " +
      "매번 다른 문장 구조와 표현으로, 실제 사용해본 사람처럼 자연스럽고 친근한 반말 또는 편한 존댓말로 2~4문장 정도의 짧은 홍보 글을 써. " +
      "과장된 광고 문구, 이모지 남발, 가격/링크/해시태그는 절대 포함하지 마 (그건 별도로 붙는다). " +
      "글 내용만 출력하고, 설명이나 따옴표는 붙이지 마.",
    messages: [
      {
        role: "user",
        content: `다음 상품을 소개하는 스레드 글을 써줘.\n상품명: ${params.productName}\n${priceLine}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI가 글을 생성하지 못했습니다.");
  }
  return textBlock.text.trim();
}
