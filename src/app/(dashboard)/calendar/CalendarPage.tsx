"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  source: "event" | "todo" | "deal";
  title: string;
  date: string;
  done?: boolean;
  href?: string;
  colorClass: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500";

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(toKey(new Date()));

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<"EVENT" | "TODO">("EVENT");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const gridStart = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - start.getDay());
    return start;
  }, [cursor]);

  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    }),
    [gridStart]
  );

  useEffect(() => {
    let cancelled = false;
    const from = days[0];
    const to = days[days.length - 1];
    fetch(`/api/calendar/combined?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLoading(false);
        if (Array.isArray(data)) setItems(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const key = toKey(new Date(it.date));
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const todosAll = items
    .filter((i) => i.source === "todo")
    .sort((a, b) => a.date.localeCompare(b.date));

  async function toggleTodo(item: Item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
    );
    await fetch(`/api/calendar/events/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
  }

  async function deleteItem(item: Item) {
    if (!confirm(`'${item.title}' 항목을 지울까요?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/calendar/events/${item.id}`, { method: "DELETE" });
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind, date: selected, memo }),
    });
    setSaving(false);
    if (!res.ok) return;
    const created = await res.json();
    setItems((prev) => [
      ...prev,
      {
        id: created.id,
        source: kind === "TODO" ? "todo" : "event",
        title: created.title,
        date: created.date,
        done: created.done,
        colorClass:
          kind === "TODO" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700",
      },
    ]);
    setTitle("");
    setMemo("");
    setFormOpen(false);
  }

  const today = toKey(new Date());
  const selectedItems = byDay.get(selected) ?? [];

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">일정 · 할일</h1>
      <p className="mb-6 text-sm text-slate-500">
        직접 적은 일정·할일과, 판매일보에 적은 판매 시작·종료·정산예정일이 함께
        보입니다.
      </p>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                ‹
              </button>
              <h2 className="w-32 text-center font-semibold text-slate-900">
                {monthLabel(cursor)}
              </h2>
              <button
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                ›
              </button>
            </div>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(1);
                setCursor(d);
                setSelected(toKey(new Date()));
              }}
              className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-800"
            >
              오늘로
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs text-slate-500">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-2">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = toKey(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const list = byDay.get(key) ?? [];
                const isSelected = key === selected;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`min-h-20 border-b border-r border-slate-100 p-1.5 text-left align-top last:border-r-0 ${
                      isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        isToday
                          ? "bg-blue-600 font-semibold text-white"
                          : inMonth
                            ? "text-slate-700"
                            : "text-slate-300"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {list.slice(0, 3).map((it) => (
                        <div
                          key={it.id}
                          className={`truncate rounded px-1 py-0.5 text-[10.5px] ${it.colorClass} ${
                            it.done ? "line-through opacity-60" : ""
                          }`}
                        >
                          {it.title}
                        </div>
                      ))}
                      {list.length > 3 && (
                        <div className="text-[10px] text-slate-400">
                          +{list.length - 3}개 더
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {selected.replaceAll("-", ". ")}
              </h3>
              <button
                onClick={() => setFormOpen((v) => !v)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                {formOpen ? "닫기" : "＋ 추가"}
              </button>
            </div>

            {formOpen && (
              <div className="mb-3 space-y-2 rounded-lg bg-slate-50 p-3">
                <div className="flex gap-2">
                  {(["EVENT", "TODO"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`rounded-full px-3 py-1 text-xs ${
                        kind === k
                          ? "bg-blue-600 font-semibold text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {k === "EVENT" ? "일정" : "할일"}
                    </button>
                  ))}
                </div>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === "EVENT" ? "예: 사라님 미팅" : "예: 정산 처리하기"}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <input
                  className={inputClass}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모 (선택)"
                />
                <button
                  onClick={submit}
                  disabled={saving || !title.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-400">불러오는 중…</p>
            ) : selectedItems.length === 0 ? (
              <p className="text-xs text-slate-400">이 날은 등록된 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedItems.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    {it.source === "todo" && (
                      <input
                        type="checkbox"
                        checked={Boolean(it.done)}
                        onChange={() => toggleTodo(it)}
                      />
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10.5px] ${it.colorClass}`}
                    >
                      {it.source === "deal" ? "공구" : it.source === "todo" ? "할일" : "일정"}
                    </span>
                    {it.href ? (
                      <Link
                        href={it.href}
                        className={`flex-1 text-sm text-slate-800 hover:text-blue-600 ${
                          it.done ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {it.title}
                      </Link>
                    ) : (
                      <span
                        className={`flex-1 text-sm text-slate-800 ${
                          it.done ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {it.title}
                      </span>
                    )}
                    {it.source !== "deal" && (
                      <button
                        onClick={() => deleteItem(it)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-slate-900">이번 달 할일</h3>
          {todosAll.length === 0 ? (
            <p className="text-xs text-slate-400">이번 달 할일이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5">
              {todosAll.map((it) => (
                <li key={it.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(it.done)}
                    onChange={() => toggleTodo(it)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm text-slate-800 ${
                        it.done ? "text-slate-400 line-through" : ""
                      }`}
                    >
                      {it.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(it.date).toLocaleDateString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
