"use client";

import { useState } from "react";

export default function InsightsRefreshButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/insights/refresh", { method: "POST" });
    // 대시보드 히어로는 자체적으로 한 번만 조회수를 불러오는 클라이언트 컴포넌트라
    // router.refresh()로는 다시 안 불러와져서, 화면 전체를 다시 로드해 확실히 반영한다.
    window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
    >
      {loading ? "확인 중..." : "조회수 새로고침"}
    </button>
  );
}
