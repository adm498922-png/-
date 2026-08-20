"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  label: string;
  username: string | null;
  isActive: boolean;
};

export default function AccountRow({
  account,
  daysLeft,
  index,
}: {
  account: Account;
  daysLeft: number | null;
  index: number;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(account.label);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/threads/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`"${account.label}" 계정 연결을 해제할까요?`)) return;
    await fetch(`/api/threads/accounts/${account.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-600">
          {index}
        </span>
        <div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-900 outline-none"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-blue-600 hover:underline"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setLabel(account.label);
                }}
                className="text-xs text-slate-500 hover:underline"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-slate-900 hover:underline"
              title="이름 수정"
            >
              {account.label}
            </button>
          )}
          <p className="text-xs text-slate-500">
            @{account.username ?? "unknown"}
            {account.isActive && daysLeft !== null && (
              <span className={daysLeft < 7 ? "text-amber-700" : ""}>
                {" "}
                · 토큰 만료 {daysLeft}일 남음
              </span>
            )}
          </p>
        </div>
        {!account.isActive && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600">
            재연결 필요
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {!account.isActive && (
          <a
            href="/api/threads/oauth/start"
            className="text-xs text-blue-600 hover:underline"
          >
            다시 연결하기
          </a>
        )}
        <button
          onClick={handleDelete}
          className="text-xs text-slate-500 hover:text-red-600"
        >
          연결 해제
        </button>
      </div>
    </div>
  );
}
