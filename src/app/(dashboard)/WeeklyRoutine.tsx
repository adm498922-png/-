"use client";

import { useRef, useState } from "react";

type RoutineItemView = {
  id: string;
  weekday: number;
  time: string | null;
  title: string;
  memo: string | null;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500";
const textareaClass = `${inputClass} resize-y`;

export default function WeeklyRoutine({
  initialItems,
}: {
  initialItems: RoutineItemView[];
}) {
  const [items, setItems] = useState(initialItems);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ time: "", title: "", memo: "" });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addingWeekday, setAddingWeekday] = useState<number | null>(null);
  const [newTime, setNewTime] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [adding, setAdding] = useState(false);

  const today = new Date().getDay();

  function itemsForDay(weekday: number) {
    return items
      .filter((i) => i.weekday === weekday)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.id.localeCompare(b.id));
  }

  function openEdit(item: RoutineItemView) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setAddingWeekday(null);
    setEditingId(item.id);
    setDraft({ time: item.time ?? "", title: item.title, memo: item.memo ?? "" });
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

  async function flushSave(id: string, d: { time: string; title: string; memo: string }) {
    if (!d.title.trim()) return;
    setSaveState("saving");
    const res = await fetch(`/api/routine/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: d.title, time: d.time, memo: d.memo }),
    });
    if (res.ok) {
      setSaveState("saved");
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, title: d.title, time: d.time.trim() || null, memo: d.memo.trim() || null }
            : i
        )
      );
    }
  }

  // 입력을 멈추면 0.6초 뒤 자동 저장 — 별도 저장 버튼 없이 바로바로 반영
  function updateDraft(id: string, patch: Partial<{ time: string; title: string; memo: string }>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => flushSave(id, next), 600);
  }

  async function deleteItem(id: string) {
    if (!confirm("이 루틴을 지울까요?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
    await fetch(`/api/routine/${id}`, { method: "DELETE" });
  }

  function openAdd(weekday: number) {
    setEditingId(null);
    setNewTime("");
    setNewTitle("");
    setNewMemo("");
    setAddingWeekday((w) => (w === weekday ? null : weekday));
  }

  async function submitAdd(weekday: number) {
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekday, time: newTime, title: newTitle, memo: newMemo }),
    });
    setAdding(false);
    if (!res.ok) return;
    const created = await res.json();
    setItems((prev) => [...prev, created]);
    setNewTime("");
    setNewTitle("");
    setNewMemo("");
    setAddingWeekday(null);
  }

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-slate-900">나의 일주일 루틴</h2>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((label, weekday) => (
          <div
            key={weekday}
            className={`rounded-lg border p-2 ${
              weekday === today ? "border-blue-300 bg-blue-50/40" : "border-slate-200"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  weekday === today ? "text-blue-600" : "text-slate-600"
                }`}
              >
                {label}
              </span>
              <button
                onClick={() => openAdd(weekday)}
                className="text-[11px] text-slate-400 hover:text-blue-600"
              >
                ＋
              </button>
            </div>

            <div className="space-y-1.5">
              {itemsForDay(weekday).map((it) =>
                editingId === it.id ? (
                  <div
                    key={it.id}
                    className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {saveState === "saving"
                          ? "저장 중…"
                          : saveState === "saved"
                            ? "저장됨"
                            : ""}
                      </span>
                      <button
                        onClick={closeEdit}
                        className="text-[10px] text-slate-500 hover:text-slate-900"
                      >
                        닫기
                      </button>
                    </div>
                    <input
                      className={inputClass}
                      value={draft.time}
                      onChange={(e) => updateDraft(it.id, { time: e.target.value })}
                      placeholder="시간 (선택, 예: 06:00)"
                    />
                    <input
                      className={inputClass}
                      value={draft.title}
                      onChange={(e) => updateDraft(it.id, { title: e.target.value })}
                    />
                    <textarea
                      className={textareaClass}
                      rows={2}
                      value={draft.memo}
                      onChange={(e) => updateDraft(it.id, { memo: e.target.value })}
                      placeholder="메모 (선택)"
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
                    className="block w-full truncate rounded-lg bg-slate-50 px-2 py-1.5 text-left hover:bg-slate-100"
                  >
                    {it.time && (
                      <span className="mr-1 text-[10px] font-semibold text-blue-600">
                        {it.time}
                      </span>
                    )}
                    <span className="text-xs text-slate-700">{it.title}</span>
                  </button>
                )
              )}
            </div>

            {addingWeekday === weekday && (
              <div className="mt-1.5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <input
                  className={inputClass}
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="시간 (선택)"
                />
                <input
                  className={inputClass}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="할 일"
                  onKeyDown={(e) => e.key === "Enter" && submitAdd(weekday)}
                  autoFocus
                />
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  placeholder="메모 (선택)"
                />
                <button
                  onClick={() => submitAdd(weekday)}
                  disabled={adding || !newTitle.trim()}
                  className="w-full rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {adding ? "저장 중…" : "저장"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
