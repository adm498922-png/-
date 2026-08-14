"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InsightsRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/insights/refresh", { method: "POST" });
    setLoading(false);
    router.refresh();
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
