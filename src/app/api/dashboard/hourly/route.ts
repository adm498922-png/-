import { NextRequest, NextResponse } from "next/server";
import { getHourlyStats } from "@/lib/dashboard-stats";

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prevDayStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const prev = new Date(y, (m ?? 1) - 1, (d ?? 1) - 1);
  const py = prev.getFullYear();
  const pm = String(prev.getMonth() + 1).padStart(2, "0");
  const pd = String(prev.getDate()).padStart(2, "0");
  return `${py}-${pm}-${pd}`;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || todayStr();
  const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });
  }
  const [stats, prevStats] = await Promise.all([
    getHourlyStats(date, accountId),
    getHourlyStats(prevDayStr(date), accountId),
  ]);
  return NextResponse.json({ ...stats, prevDayTotalViews: prevStats.totalViews });
}
