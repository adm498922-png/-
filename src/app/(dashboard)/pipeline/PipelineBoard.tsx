"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CREATOR_STATUSES,
  CREATOR_STATUS_LABEL,
  PLATFORM_LABEL,
  formatFollowers,
  getCreatorGrade,
  CREATOR_GRADE_LABEL,
  type CreatorStatusKey,
} from "@/lib/gonggu";

export type PipelineCreator = {
  id: string;
  name: string;
  handle: string | null;
  platform: string;
  followers: number | null;
  category: string | null;
  tags: string | null;
  contactType: string | null;
  memo: string | null;
  status: string;
  lastContactAt: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  engagementRate: number | null;
};

// 컨택중·확정 단계에서 이 일수 이상 연락이 없으면 "팔로업 필요"로 빨갛게 띄운다
const FOLLOWUP_DAYS = 3;
const FOLLOWUP_STATUSES = new Set(["CONTACTED", "CONFIRMED"]);

// 칸 순서: 영업 흐름 순 (후보 → 컨택중 → 확정 → 진행중 → 완료 → 보류 → 거절)
const COLUMNS: CreatorStatusKey[] = [...CREATOR_STATUSES];

const COLUMN_ACCENT: Record<string, string> = {
  LEAD: "border-t-slate-300",
  CONTACTED: "border-t-sky-400",
  CONFIRMED: "border-t-indigo-400",
  ONGOING: "border-t-amber-400",
  DONE: "border-t-green-400",
  HOLD: "border-t-slate-300",
  REJECTED: "border-t-red-300",
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/** 지금 단계에 며칠째 머물러 있는지 (상태 변경 기록이 없으면 등록일 기준) */
function daysInStage(c: PipelineCreator): number {
  return daysSince(c.statusChangedAt ?? c.createdAt) ?? 0;
}

/** 마지막 연락에서 며칠 지났는지 — 연락 기록이 없으면 단계 진입일 기준 */
function daysSinceContact(c: PipelineCreator): number {
  return daysSince(c.lastContactAt) ?? daysInStage(c);
}

function needsFollowUp(c: PipelineCreator): boolean {
  return FOLLOWUP_STATUSES.has(c.status) && daysSinceContact(c) >= FOLLOWUP_DAYS;
}

function splitTags(tags: string | null): string[] {
  return (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function PipelineBoard({
  initialItems,
}: {
  initialItems: PipelineCreator[];
}) {
  const [items, setItems] = useState(initialItems);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.name, c.handle ?? "", c.category ?? "", c.tags ?? "", c.memo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  const byStatus = useMemo(() => {
    const map = new Map<string, PipelineCreator[]>();
    for (const s of COLUMNS) map.set(s, []);
    for (const c of filtered) {
      (map.get(c.status) ?? map.get("LEAD"))!.push(c);
    }
    // 팔로업 필요한 카드를 맨 위로, 그 안에서는 연락 안 한 지 오래된 순
    for (const [, list] of map) {
      list.sort((a, b) => {
        const fa = needsFollowUp(a) ? 1 : 0;
        const fb = needsFollowUp(b) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        if (fa === 1) return daysSinceContact(b) - daysSinceContact(a);
        return daysInStage(a) - daysInStage(b);
      });
    }
    return map;
  }, [filtered]);

  const totalFollowUps = useMemo(
    () => items.filter(needsFollowUp).length,
    [items]
  );

  async function moveTo(id: string, status: string) {
    const target = items.find((c) => c.id === id);
    if (!target || target.status === status) return;
    // 화면 먼저 옮기고(바로 반응), 저장은 뒤에서 — 실패하면 되돌린다
    const prev = items;
    setItems((list) =>
      list.map((c) =>
        c.id === id
          ? { ...c, status, statusChangedAt: new Date().toISOString() }
          : c
      )
    );
    const res = await fetch(`/api/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (!res?.ok) setItems(prev);
  }

  async function markContacted(id: string) {
    const now = new Date().toISOString();
    const prev = items;
    setItems((list) =>
      list.map((c) => (c.id === id ? { ...c, lastContactAt: now } : c))
    );
    const res = await fetch(`/api/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastContactAt: now }),
    }).catch(() => null);
    if (!res?.ok) setItems(prev);
  }

  return (
    // 칸반 보드는 가로로 넓게 써야 해서, 캘린더처럼 가운데 폭 제한을 벗어난다
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-8">
      <div className="mx-auto w-full max-w-[1700px]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">영업 파이프라인</h1>
            <p className="text-sm text-slate-500">
              카드를 끌어서 옆 칸에 놓으면 단계가 바뀝니다. 컨택중·확정 단계에서{" "}
              {FOLLOWUP_DAYS}일 이상 연락이 없으면 빨갛게 위로 올라와요.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {totalFollowUps > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600">
                팔로업 필요 {totalFollowUps}건
              </span>
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·아이디·태그 검색"
              className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
            <span className="text-sm text-slate-400">총 {items.length}명</span>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const list = byStatus.get(status) ?? [];
            const followUps = list.filter(needsFollowUp).length;
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (dragId) moveTo(dragId, status);
                  setDragId(null);
                }}
                className={`flex w-[280px] shrink-0 flex-col rounded-xl border border-t-4 bg-slate-50/60 ${
                  COLUMN_ACCENT[status] ?? "border-t-slate-300"
                } ${
                  dragOver === status
                    ? "border-blue-400 bg-blue-50/60"
                    : "border-slate-200"
                }`}
              >
                <div className="px-3 pb-1.5 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      {CREATOR_STATUS_LABEL[status]}
                    </span>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {list.length}
                    </span>
                  </div>
                  {followUps > 0 && (
                    <p className="mt-0.5 text-xs font-semibold text-red-600">
                      {followUps}건 팔로업 필요
                    </p>
                  )}
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3" style={{ maxHeight: "68vh" }}>
                  {list.length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-slate-400">
                      여기로 카드를 끌어다 놓으세요
                    </p>
                  )}
                  {list.map((c) => {
                    const followUp = needsFollowUp(c);
                    const stageDays = daysInStage(c);
                    const contactDays = daysSince(c.lastContactAt);
                    const grade = getCreatorGrade(c.followers);
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`cursor-grab rounded-lg border bg-white p-2.5 shadow-sm active:cursor-grabbing ${
                          followUp
                            ? "border-red-300 ring-1 ring-red-200"
                            : "border-slate-200"
                        } ${dragId === c.id ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/creators/${c.id}`}
                            className="min-w-0 text-sm font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {c.name}
                            {c.handle && (
                              <span className="ml-1 text-xs font-normal text-slate-400">
                                @{c.handle}
                              </span>
                            )}
                          </Link>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {stageDays}일째
                          </span>
                        </div>

                        {followUp && (
                          <p className="mt-1 text-[11px] font-semibold text-red-600">
                            팔로업 필요 · 연락한 지{" "}
                            {contactDays === null ? `${stageDays}일+` : `${contactDays}일`}
                          </p>
                        )}

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            {PLATFORM_LABEL[c.platform] ?? c.platform}
                          </span>
                          {c.followers !== null && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                              {formatFollowers(c.followers)} ·{" "}
                              {CREATOR_GRADE_LABEL[grade]}
                            </span>
                          )}
                          {c.category && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              {c.category}
                            </span>
                          )}
                          {splitTags(c.tags).map((t) => (
                            <span
                              key={t}
                              className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600"
                            >
                              {t}
                            </span>
                          ))}
                          {c.contactType && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              {c.contactType}
                            </span>
                          )}
                        </div>

                        {c.memo && (
                          <p
                            className="mt-1.5 whitespace-pre-wrap rounded bg-amber-50 px-1.5 py-1 text-[11px] leading-snug text-slate-600"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                            title={c.memo}
                          >
                            {c.memo}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {contactDays === null
                              ? "연락 기록 없음"
                              : contactDays === 0
                                ? "오늘 연락함"
                                : `연락 ${contactDays}일 전`}
                          </span>
                          <button
                            onClick={() => markContacted(c.id)}
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:border-blue-300 hover:text-blue-600"
                            title="오늘 연락한 것으로 기록"
                          >
                            ✓ 연락함
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
