"use client";

import { useEffect, useState } from "react";

type Account = { id: string; label: string; username: string | null };
type HourlyStat = {
  hour: number;
  count: number;
  views: number;
  isBest: boolean;
  scheduledCount: number;
};
type HourlyResponse = {
  date: string;
  hourly: HourlyStat[];
  totalPosts: number;
  totalViews: number;
  avgViews: number;
  prevDayTotalViews: number;
};

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

/**
 * 셀 색상 규칙(사용자 지정): 조회수 두 자리 이하(0~99) = 빨강,
 * 세 자리(100~999) = 보라, 네 자리 이상(1000+) = 파랑, 발행예정 = 노랑.
 */
function cellStyle(h: HourlyStat) {
  if (h.count > 0 && h.views >= 1000) {
    return "border-blue-500 bg-blue-950/60";
  }
  if (h.count > 0 && h.views >= 100) {
    return "border-purple-500 bg-purple-950/60";
  }
  if (h.count > 0) {
    return "border-red-500 bg-red-950/60";
  }
  if (h.scheduledCount > 0) {
    return "border-yellow-500 bg-yellow-950/60";
  }
  return "border-neutral-800 bg-neutral-950/40";
}

/** 이 서비스만의 자동 발행 마스코트 "그리" 아이콘 (원본 디자인) */
function GeuriIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="5" r="1.4" fill="#60a5fa" />
      <line x1="12" y1="6.4" x2="12" y2="8.5" stroke="#60a5fa" strokeWidth="1.2" />
      <rect
        x="5.5"
        y="8.5"
        width="13"
        height="9.5"
        rx="3.5"
        fill="#1e293b"
        stroke="#60a5fa"
        strokeWidth="1.2"
      />
      <circle cx="9.3" cy="13.2" r="1.5" fill="#60a5fa" />
      <circle cx="14.7" cy="13.2" r="1.5" fill="#60a5fa" />
      <rect x="2.5" y="11.5" width="2" height="4" rx="1" fill="#334155" />
      <rect x="19.5" y="11.5" width="2" height="4" rx="1" fill="#334155" />
    </svg>
  );
}

export default function DashboardHero({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<HourlyResponse | null>(null);
  const loading = !data || data.date !== date;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    function load() {
      fetch(`/api/dashboard/hourly?date=${date}&accountId=${accountId}`)
        .then((res) => res.json())
        .then((json) => {
          if (!cancelled) setData(json);
        });
    }

    load();
    // 조회수 수집은 서버에서 매 10분마다 자동으로 돌아가므로, 화면도 주기적으로
    // 다시 불러와서 새로고침 없이 최신 숫자가 보이게 함.
    const interval = setInterval(load, 60_000);
    // "조회수 새로고침" 버튼을 누르면 다음 60초를 기다리지 않고 바로 반영
    window.addEventListener("insights-refreshed", load);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("insights-refreshed", load);
    };
  }, [date, accountId]);

  if (accounts.length === 0) return null;

  const trendUp = data ? data.totalViews >= data.prevDayTotalViews : true;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {accounts.length > 1 &&
            accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccountId(a.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  a.id === accountId
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {a.label}
              </button>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">{formatDateLabel(date)}</span>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-500">불러오는 중...</p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm text-neutral-400">이 날 올린 글 조회수</p>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                trendUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              }`}
            >
              {trendUp ? "▲ 어제보다 상승" : "▼ 어제보다 하락"}
            </span>
          </div>
          <p className="mb-1 text-4xl font-bold text-white sm:text-5xl">
            {data.totalViews.toLocaleString("ko-KR")}
          </p>
          <p className="mb-5 text-sm text-neutral-500">
            {data.totalPosts}건 발행 · 글당 평균 {data.avgViews.toLocaleString("ko-KR")}회
          </p>

          <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              조회수 0~99
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
              조회수 100~999
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              조회수 1,000+
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              발행 예정
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {data.hourly.map((h) => (
              <div
                key={h.hour}
                className={`relative rounded-lg border p-2 text-center ${cellStyle(h)}`}
              >
                {h.isBest && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500/30 px-1.5 py-px text-[8px] font-medium text-green-300">
                    BEST
                  </span>
                )}
                <p className="text-[10px] text-neutral-500">{h.hour}시</p>
                <p className="text-sm font-semibold text-white">
                  {h.count > 0 ? h.count : h.scheduledCount > 0 ? h.scheduledCount : "-"}
                </p>
                <p className="text-[9px] text-neutral-500">
                  {h.count > 0 ? h.views.toLocaleString("ko-KR") : ""}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-1.5 border-t border-neutral-800 pt-3 text-xs text-neutral-500">
            <GeuriIcon />
            <span>
              <span className="font-semibold text-neutral-300">그리</span> · 무인 자동 발행중
            </span>
          </div>
        </>
      )}
    </div>
  );
}
