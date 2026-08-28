"use client";

import { useRef, useState } from "react";

type SettlementNoteView = {
  id: string;
  date: string | null;
  memo: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500";
const textareaClass = `${inputClass} resize-y`;

function formatDate(date: string | null) {
  if (!date) return null;
  const [, m, d] = date.split("-");
  if (!m || !d) return date;
  return `${Number(m)}/${Number(d)}`;
}

export default function SettlementNotes({
  initialItems,
}: {
  initialItems: SettlementNoteView[];
}) {
  const [items, setItems] = useState(initialItems);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: "", memo: "" });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const sorted = [...items].sort((a, b) => {
    if (!a.date && !b.date) return a.id.localeCompare(b.id);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  function openEdit(item: SettlementNoteView) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setAdding(false);
    setEditingId(item.id);
    setDraft({ date: item.date ?? "", memo: item.memo });
    setSaveState("idle");
  }

  function closeEdit() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (editingId) flushSave(editingId, draft);
    }
    setEditingId(null);
  }

  async function flushSave(id: string, d: { date: string; memo: string }) {
    if (!d.memo.trim()) return;
    setSaveState("saving");
    const res = await fetch(`/api/settlement-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: d.date, memo: d.memo }),
    });
    if (res.ok) {
      setSaveState("saved");
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, date: d.date.trim() || null, memo: d.memo } : i
        )
      );
    }
  }

  // 입력을 멈추면 0.6초 뒤 자동 저장 — 별도 저장 버튼 없이 바로바로 반영
  function updateDraft(id: string, patch: Partial<{ date: string; memo: string }>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => flushSave(id, next), 600);
  }

  async function deleteItem(id: string) {
    if (!confirm("이 메모를 지울까요?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
    await fetch(`/api/settlement-notes/${id}`, { method: "DELETE" });
  }

  function openAdd() {
    setEditingId(null);
    setNewDate("");
    setNewMemo("");
    setAdding((v) => !v);
  }

  async function submitAdd() {
    if (!newMemo.trim()) return;
    setSubmittingAdd(true);
    const res = await fetch("/api/settlement-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, memo: newMemo }),
    });
    setSubmittingAdd(false);
    if (!res.ok) return;
    const created = await res.json();
    setItems((prev) => [...prev, created]);
    setNewDate("");
    setNewMemo("");
    setAdding(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">메모</h2>
        <button
          onClick={openAdd}
          className="text-xs text-slate-400 hover:text-blue-600"
        >
          ＋ 메모 추가
        </button>
      </div>

      {adding && (
        <div className="mb-3 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <input
            type="date"
            className={inputClass}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <textarea
            className={textareaClass}
            rows={2}
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="예: OO 정산 입금 예정"
            autoFocus
          />
          <button
            onClick={submitAdd}
            disabled={submittingAdd || !newMemo.trim()}
            className="w-full rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {submittingAdd ? "저장 중…" : "저장"}
          </button>
        </div>
      )}

      {sorted.length === 0 && !adding && (
        <p className="text-xs text-slate-400">아직 남긴 메모가 없습니다.</p>
      )}

      <div className="space-y-1.5">
        {sorted.map((it) =>
          editingId === it.id ? (
            <div
              key={it.id}
              className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {saveState === "saving" ? "저장 중…" : saveState === "saved" ? "저장됨" : ""}
                </span>
                <button
                  onClick={closeEdit}
                  className="text-[10px] text-slate-500 hover:text-slate-900"
                >
                  닫기
                </button>
              </div>
              <input
                type="date"
                className={inputClass}
                value={draft.date}
                onChange={(e) => updateDraft(it.id, { date: e.target.value })}
              />
              <textarea
                className={textareaClass}
                rows={2}
                value={draft.memo}
                onChange={(e) => updateDraft(it.id, { memo: e.target.value })}
              />
              <button
                onClick={() => deleteItem(it.id)}
                className="text-[10px] text-slate-400 hover:text-red-500"
              >
                삭제
              </button>
            </div>
          ) : (
            <button
              key={it.id}
              type="button"
              onClick={() => openEdit(it)}
              className="block w-full rounded-lg bg-slate-50 px-2 py-1.5 text-left hover:bg-slate-100"
            >
              {it.date && (
                <span className="mr-1.5 text-[10px] font-semibold text-blue-600">
                  {formatDate(it.date)}
                </span>
              )}
              <span className="whitespace-pre-line break-words text-xs text-slate-700">
                {it.memo}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
