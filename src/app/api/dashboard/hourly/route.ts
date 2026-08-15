import { NextRequest, NextResponse } from "next/server";
import { getHourlyStats } from "@/lib/dashboard-stats";

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });
  }
  const stats = await getHourlyStats(date);
  return NextResponse.json(stats);
}
