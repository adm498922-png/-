import { NextResponse } from "next/server";
import { gatherBriefingData } from "@/lib/daily-briefing";

/** 대시보드 "오늘 브리핑" 칸이 쓰는 데이터 (아침 메일과 같은 내용) */
export async function GET() {
  const data = await gatherBriefingData();
  return NextResponse.json(data);
}
