import { NextResponse } from "next/server";
import { generateAndScheduleDailyPost } from "@/lib/auto-daily-post";

const SKIP_MESSAGES: Record<string, string> = {
  "no-openai-key": "설정 화면에서 OpenAI API 키를 먼저 입력해주세요.",
  "no-active-accounts": "연결된(정상 상태) 스레드 계정이 없습니다.",
};

export async function POST() {
  try {
    const result = await generateAndScheduleDailyPost({ force: true });
    if ("skipped" in result) {
      return NextResponse.json(
        { error: SKIP_MESSAGES[result.skipped] ?? "실행할 수 없습니다." },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("자동 일상글 수동 실행 실패", e);
    return NextResponse.json(
      { error: "실행 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
