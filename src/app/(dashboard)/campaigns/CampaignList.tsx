"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CAMPAIGN_STATUS_CLASS,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  campaignSummaryLine,
  campaignTargetTotal,
  type CampaignView,
} from "@/lib/campaign";

type FormValues = {
  type: "AD" | "COLLAB";
  brand: string;
  name: string;
  category: string;
  desc: string;
  microTarget: string;
  macroTarget: string;
  megaTarget: string;
  budget: string;
  period: string;
  productShip: boolean;
  secondaryUse: boolean;
  salePrice: string;
  listPrice: string;
  commissionRate: string;
  targetQty: string;
  collabStart: string;
  collabEnd: string;
  promo: string;
};

function emptyForm(): FormValues {
  return {
    type: "AD",
    brand: "",
    name: "",
    category: "",
    desc: "",
    microTarget: "0",
    macroTarget: "0",
    megaTarget: "0",
    budget: "",
    period: "",
    productShip: false,
    secondaryUse: false,
    salePrice: "",
    listPrice: "",
    commissionRate: "",
    targetQty: "",
    collabStart: "",
    collabEnd: "",
    promo: "",
  };
}

function toForm(c: CampaignView): FormValues {
  return {
    type: c.type,
    brand: c.brand,
    name: c.name,
    category: c.category ?? "",
    desc: c.desc ?? "",
    microTarget: String(c.microTarget ?? 0),
    macroTarget: String(c.macroTarget ?? 0),
    megaTarget: String(c.megaTarget ?? 0),
    budget: c.budget === null ? "" : String(c.budget),
    period: c.period ?? "",
    productShip: Boolean(c.productShip),
    secondaryUse: Boolean(c.secondaryUse),
    salePrice: c.salePrice === null ? "" : String(c.salePrice),
    listPrice: c.listPrice === null ? "" : String(c.listPrice),
    commissionRate: c.commissionRate === null ? "" : String(c.commissionRate),
    targetQty: c.targetQty === null ? "" : String(c.targetQty),
    collabStart: c.collabStart ? String(c.collabStart).slice(0, 10) : "",
    collabEnd: c.collabEnd ? String(c.collabEnd).slice(0, 10) : "",
    promo: c.promo ?? "",
  };
}

const CATEGORY_OPTIONS = [
  "식품/음료",
  "뷰티/화장품",
  "패션/의류",
  "IT/테크",
  "리빙/가구",
  "여행/레저",
  "건강/피트니스",
  "육아/키즈",
  "서비스/앱",
  "기타",
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";
const labelClass = "mb-1 block text-xs text-slate-500";

export default function CampaignList({
  initialCampaigns,
}: {
  initialCampaigns: CampaignView[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const set = <K extends keyof FormValues>(key: K) => (value: FormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(c: CampaignView) {
    setEditingId(c.id);
    setForm(toForm(c));
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(editingId ? `/api/campaigns/${editingId}` : "/api/campaigns", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setCampaigns((prev) =>
      editingId ? prev.map((c) => (c.id === editingId ? data : c)) : [data, ...prev]
    );
    setOpen(false);
    setEditingId(null);
  }

  async function handleDelete(c: CampaignView) {
    if (!confirm(`'${c.name}' 캠페인을 삭제할까요? 배정 기록도 함께 지워집니다.`)) return;
    await fetch(`/api/campaigns/${c.id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
  }

  const visible = campaigns.filter((c) => statusFilter === "ALL" || c.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "DRAFT", "ACTIVE", "COMPLETED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                statusFilter === s
                  ? "bg-blue-600 font-semibold text-white"
                  : "bg-white text-slate-500 hover:text-slate-900"
              }`}
            >
              {s === "ALL" ? "전체" : CAMPAIGN_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => (open ? setOpen(false) : openNew())}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {open ? "닫기" : "＋ 캠페인 생성"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="font-semibold text-slate-900">
            {editingId ? "캠페인 수정" : "새 캠페인 생성"}
          </h2>

          <div>
            <label className={labelClass}>캠페인 유형</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set("type")("AD")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                  form.type === "AD" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                📢 광고 캠페인
              </button>
              <button
                type="button"
                onClick={() => set("type")("COLLAB")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                  form.type === "COLLAB" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                🛒 공구/협업
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                브랜드 <span className="ml-1 text-slate-400">필수</span>
              </label>
              <input
                className={inputClass}
                value={form.brand}
                onChange={(e) => set("brand")(e.target.value)}
                placeholder="예: 바이탈플랜트"
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>
                캠페인명 <span className="ml-1 text-slate-400">필수</span>
              </label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="예: 봄 신제품 런칭"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>카테고리</label>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => set("category")(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>캠페인 설명</label>
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              value={form.desc}
              onChange={(e) => set("desc")(e.target.value)}
              placeholder="제품/서비스 특징과 매칭 희망 타겟을 적어주세요"
            />
          </div>

          {form.type === "AD" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>마이크로 인원</label>
                  <input
                    className={inputClass}
                    value={form.microTarget}
                    onChange={(e) => set("microTarget")(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>매크로 인원</label>
                  <input
                    className={inputClass}
                    value={form.macroTarget}
                    onChange={(e) => set("macroTarget")(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>메가 인원</label>
                  <input
                    className={inputClass}
                    value={form.megaTarget}
                    onChange={(e) => set("megaTarget")(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>예산 (원)</label>
                  <input
                    className={inputClass}
                    value={form.budget}
                    onChange={(e) => set("budget")(e.target.value)}
                    placeholder="3000000"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>업로드 기간</label>
                  <input
                    className={inputClass}
                    value={form.period}
                    onChange={(e) => set("period")(e.target.value)}
                    placeholder="2026-05-01 ~ 2026-05-15"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.productShip}
                    onChange={(e) => set("productShip")(e.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  제품 제공
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.secondaryUse}
                    onChange={(e) => set("secondaryUse")(e.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  2차 활용 희망
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>판매가 (원)</label>
                  <input
                    className={inputClass}
                    value={form.salePrice}
                    onChange={(e) => set("salePrice")(e.target.value)}
                    placeholder="29900"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>정가 (원)</label>
                  <input
                    className={inputClass}
                    value={form.listPrice}
                    onChange={(e) => set("listPrice")(e.target.value)}
                    placeholder="49900"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>수수료 (%)</label>
                  <input
                    className={inputClass}
                    value={form.commissionRate}
                    onChange={(e) => set("commissionRate")(e.target.value)}
                    placeholder="15"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className={labelClass}>목표 수량</label>
                  <input
                    className={inputClass}
                    value={form.targetQty}
                    onChange={(e) => set("targetQty")(e.target.value)}
                    placeholder="100"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>진행 시작</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.collabStart}
                    onChange={(e) => set("collabStart")(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>진행 종료</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.collabEnd}
                    onChange={(e) => set("collabEnd")(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>혜택/프로모션</label>
                <input
                  className={inputClass}
                  value={form.promo}
                  onChange={(e) => set("promo")(e.target.value)}
                  placeholder="전원 증정품, 한정 쿠폰 등"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {saving ? "저장 중…" : editingId ? "수정 저장" : "캠페인 생성"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">
            {campaigns.length === 0 ? "아직 등록한 캠페인이 없습니다." : "조건에 맞는 캠페인이 없습니다."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((c) => {
            const assignedCount = c.assignments?.length ?? 0;
            const sentCount = c.assignments?.filter((a) => a.status === "SENT").length ?? 0;
            return (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{c.type === "AD" ? "📢" : "🛒"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                          CAMPAIGN_STATUS_CLASS[c.status]
                        }`}
                      >
                        {CAMPAIGN_STATUS_LABEL[c.status]}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                        {CAMPAIGN_TYPE_LABEL[c.type]}
                      </span>
                      {c.category && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-600">{c.brand}</p>
                    {campaignSummaryLine(c) && (
                      <p className="mt-1 text-[11px] text-slate-500">{campaignSummaryLine(c)}</p>
                    )}
                    {c.desc && <p className="mt-1.5 text-xs text-slate-500">{c.desc}</p>}
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      배정된 크리에이터 <strong className="text-blue-600">{assignedCount}명</strong>
                      {assignedCount > 0 && ` · 발송완료 ${sentCount}명`}
                      {c.type === "AD" && campaignTargetTotal(c) > 0 && ` · 목표 ${campaignTargetTotal(c)}명`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Link
                      href={`/campaigns/${c.id}/match`}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      매칭 →
                    </Link>
                    <Link
                      href={`/dm-queue?campaign=${c.id}`}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-center text-xs font-semibold text-green-700 hover:bg-green-100"
                    >
                      DM 발송
                    </Link>
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
