"use client";

import { useEffect, useState } from "react";

type HourlyStat = { hour: number; count: number; views: number; isBest: boolean };
type HourlyResponse = {
  date: string;
  hourly: HourlyStat[];
  totalPosts: number;
  totalViews: number;
  avgViews: number;
};

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function HourlyStatsPanel() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<HourlyResponse | null>(null);
  const loading = !data || data.date !== date;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/hourly?date=${date}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-300">시간대별 발행 현황</h2>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>

      {loading || !data ? (
        <p className="text-sm text-neutral-500">불러오는 중...</p>
      ) : data.totalPosts === 0 ? (
        <p className="text-sm text-neutral-500">이 날짜에 발행된 글이 없습니다.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-neutral-500">총 조회수</p>
              <p className="text-xl font-semibold text-white">
                {data.totalViews.toLocaleString("ko-KR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">발행 건수</p>
              <p className="text-xl font-semibold text-white">
                {data.totalPosts.toLocaleString("ko-KR")}건
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">글당 평균 조회수</p>
              <p className="text-xl font-semibold text-white">
                {data.avgViews.toLocaleString("ko-KR")}회
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {data.hourly.map((h) => (
              <div
                key={h.hour}
                className={`relative rounded-lg border p-2 text-center ${
                  h.count > 0
                    ? "border-neutral-700 bg-neutral-950"
                    : "border-neutral-800 bg-neutral-950/40"
                }`}
              >
                {h.isBest && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500/20 px-1.5 text-[10px] font-medium text-green-400">
                    BEST
                  </span>
                )}
                <p className="text-[11px] text-neutral-500">
                  {String(h.hour).padStart(2, "0")}시
                </p>
                <p className="text-sm font-medium text-white">
                  {h.count > 0 ? h.count : "-"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {h.count > 0 ? h.views.toLocaleString("ko-KR") : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
