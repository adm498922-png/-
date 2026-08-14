"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  label: string;
  username: string | null;
  tokenExpiresAt: Date | null;
  isActive: boolean;
};

export default function AccountRow({
  account,
  index,
}: {
  account: Account;
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

  const expiresAt = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt)
    : null;
  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-400">
          {index}
        </span>
        <div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white outline-none"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-blue-400 hover:underline"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setLabel(account.label);
                }}
                className="text-xs text-neutral-500 hover:underline"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-white hover:underline"
              title="이름 수정"
            >
              {account.label}
            </button>
          )}
          <p className="text-xs text-neutral-500">
            @{account.username ?? "unknown"}
            {daysLeft !== null && (
              <span className={daysLeft < 7 ? "text-amber-400" : ""}>
                {" "}
                · 토큰 만료 {daysLeft}일 남음
              </span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="text-xs text-neutral-500 hover:text-red-400"
      >
        연결 해제
      </button>
    </div>
  );
}
