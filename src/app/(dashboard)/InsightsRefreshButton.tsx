"use client";

import { useState } from "react";

export default function InsightsRefreshButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/insights/refresh", { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (data) {
      setResult(`성공 ${data.succeeded}개 / 실패 ${data.failed}개 (전체 ${data.total}개)`);
      setTimeout(() => setResult(null), 6000);
    }
    // 대시보드는 1분마다 스스로 새로고침되지만, 방금 수집한 값을 바로 보고
    // 싶을 수 있어 화면도 같이 갱신한다 (팝업 없이 조용히).
    window.dispatchEvent(new Event("insights-refreshed"));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
      >
        {loading ? "확인 중..." : "조회수 새로고침"}
      </button>
      {result && <span className="text-xs text-slate-500">{result}</span>}
    </div>
  );
}
