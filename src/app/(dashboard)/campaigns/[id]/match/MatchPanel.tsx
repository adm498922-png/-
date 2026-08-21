"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CREATOR_GRADE_CLASS,
  CREATOR_GRADE_LABEL,
  CREATOR_STATUS_CLASS,
  CREATOR_STATUS_LABEL,
  formatFollowers,
  getCreatorGrade,
  type CreatorGrade,
  type CreatorView,
} from "@/lib/gonggu";
import type { CampaignView } from "@/lib/campaign";

const inputClass =
  "rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";

export default function MatchPanel({
  campaign,
  initialCreators,
}: {
  campaign: CampaignView;
  initialCreators: CreatorView[];
}) {
  const router = useRouter();
  const [assignedIds, setAssignedIds] = useState<Set<string>>(
    new Set((campaign.assignments ?? []).map((a) => a.creatorId))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<CreatorGrade | "">("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialCreators.filter((c) => {
      if (grade && getCreatorGrade(c.followers) !== grade) return false;
      if (!q) return true;
      const haystack = [c.name, c.handle, c.category, c.memo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [initialCreators, query, grade]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assignSelected(): Promise<boolean> {
    if (selected.size === 0) {
      setNotice("배정할 크리에이터를 선택해주세요.");
      return false;
    }
    setBusy(true);
    const res = await fetch(`/api/campaigns/${campaign.id}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorIds: Array.from(selected) }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setNotice(data?.error ?? "배정하지 못했습니다.");
      return false;
    }
    setAssignedIds((prev) => {
      const next = new Set(prev);
      selected.forEach((id) => next.add(id));
      return next;
    });
    setNotice(`${data.added}명 배정됨 (이미 배정된 ${selected.size - data.added}명 제외)`);
    setSelected(new Set());
    return true;
  }

  async function handleConfirm() {
    await assignSelected();
  }

  async function handleGoToDm() {
    const ok = await assignSelected();
    if (ok || assignedIds.size > 0) {
      router.push(`/dm-queue?campaign=${campaign.id}`);
    }
  }

  const assignedCount = assignedIds.size;

  return (
    <div className="card space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">
          크리에이터 선택 <span className="ml-1 text-xs font-normal text-blue-600">{selected.size}명 선택 · 배정됨 {assignedCount}명</span>
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} min-w-48 flex-1`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 이름·아이디·카테고리 검색"
        />
        <select
          className={inputClass}
          value={grade}
          onChange={(e) => setGrade(e.target.value as CreatorGrade | "")}
        >
          <option value="">전체 등급</option>
          <option value="micro">마이크로</option>
          <option value="macro">매크로</option>
          <option value="mega">메가</option>
        </select>
      </div>

      {notice && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800">{notice}</p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
          조건에 맞는 크리에이터가 없습니다.
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="w-9 px-3 py-2"></th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">이름</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-slate-500">팔로워</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">등급</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">카테고리</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const g = getCreatorGrade(c.followers);
                const isSelected = selected.has(c.id);
                const isAssigned = assignedIds.has(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`cursor-pointer border-t border-slate-100 ${
                      isSelected ? "bg-blue-50" : isAssigned ? "bg-green-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-medium text-slate-900">{c.name}</span>
                      {c.handle && <span className="ml-1.5 text-xs text-slate-400">@{c.handle}</span>}
                      {isAssigned && (
                        <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                          배정됨
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-700">{formatFollowers(c.followers)}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${CREATOR_GRADE_CLASS[g]}`}>
                        {CREATOR_GRADE_LABEL[g]}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500">{c.category || "-"}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          CREATOR_STATUS_CLASS[c.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {CREATOR_STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
        >
          선택 확정 → 캠페인에 배정
        </button>
        <button
          onClick={handleGoToDm}
          disabled={busy}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:bg-slate-200 disabled:text-slate-500"
        >
          → 배정 후 DM 발송으로 이동
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          선택 해제
        </button>
      </div>
    </div>
  );
}
