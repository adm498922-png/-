"use client";

import { useState } from "react";

export default function InsightsRefreshButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/insights/refresh", { method: "POST" });
    const data = await res.json().catch(() => null);
    // 조회수 수집이 계정/게시물별로 조용히 실패해도 화면엔 안 보였어서,
    // 원인 확인을 위해 임시로 성공/실패 건수를 보여준다.
    if (data) {
      alert(
        `조회수 수집 완료 — 성공 ${data.succeeded}개 / 실패 ${data.failed}개 (전체 ${data.total}개)`
      );
    }
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
