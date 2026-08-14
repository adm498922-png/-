"use client";

import { useState } from "react";
import type { SettingsStatus } from "@/lib/settings";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-green-500/15 text-green-400"
          : "bg-neutral-700 text-neutral-400"
      }`}
    >
      {ok ? "설정됨" : "미설정"}
    </span>
  );
}

export default function SettingsForm({
  status,
  suggestedRedirectUri,
}: {
  status: SettingsStatus;
  suggestedRedirectUri: string;
}) {
  const [coupangAccessKey, setCoupangAccessKey] = useState("");
  const [coupangSecretKey, setCoupangSecretKey] = useState("");
  const [threadsAppId, setThreadsAppId] = useState(status.threadsAppId ?? "");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");
  const [threadsRedirectUri, setThreadsRedirectUri] = useState(
    status.threadsRedirectUri ?? suggestedRedirectUri
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [current, setCurrent] = useState(status);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupangAccessKey,
        coupangSecretKey,
        threadsAppId,
        threadsAppSecret,
        threadsRedirectUri,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("저장에 실패했습니다.");
      return;
    }
    const updated = await res.json();
    setCurrent(updated);
    setCoupangAccessKey("");
    setCoupangSecretKey("");
    setThreadsAppSecret("");
    setMessage("저장되었습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">쿠팡파트너스</h2>
          <StatusBadge ok={current.coupangConfigured} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          쿠팡Wing &gt; 판매자정보 &gt; 추가판매자정보에서 발급받은 OpenAPI
          Access Key / Secret Key를 입력하세요.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Access Key
            </label>
            <input
              value={coupangAccessKey}
              onChange={(e) => setCoupangAccessKey(e.target.value)}
              placeholder={
                current.coupangConfigured
                  ? `현재: ${current.coupangAccessKeyPreview} (변경하려면 입력)`
                  : "예: 1a2b3c4d..."
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Secret Key
            </label>
            <input
              type="password"
              value={coupangSecretKey}
              onChange={(e) => setCoupangSecretKey(e.target.value)}
              placeholder={
                current.coupangConfigured
                  ? "저장되어 있음 (변경하려면 입력)"
                  : ""
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold text-white">Threads 개발자 앱</h2>
          <StatusBadge ok={current.threadsConfigured} />
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          Meta 개발자 앱의 App ID / App Secret을 입력하고, 아래 Redirect URI를
          Meta 개발자 콘솔의 Threads &gt; 설정에 동일하게 등록하세요.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              App ID
            </label>
            <input
              value={threadsAppId}
              onChange={(e) => setThreadsAppId(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              App Secret
            </label>
            <input
              type="password"
              value={threadsAppSecret}
              onChange={(e) => setThreadsAppSecret(e.target.value)}
              placeholder={
                current.threadsConfigured
                  ? "저장되어 있음 (변경하려면 입력)"
                  : ""
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Redirect URI (Meta 콘솔에 그대로 등록)
            </label>
            <input
              value={threadsRedirectUri}
              onChange={(e) => setThreadsRedirectUri(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {message && <p className="text-sm text-blue-400">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
