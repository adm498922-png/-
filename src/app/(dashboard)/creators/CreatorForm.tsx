"use client";

import { useState } from "react";
import {
  CONTACT_TYPES,
  CREATOR_STATUSES,
  CREATOR_STATUS_LABEL,
  PLATFORMS,
  PLATFORM_LABEL,
  toDateInput,
  type CreatorView,
} from "@/lib/gonggu";

export type CreatorFormValues = {
  name: string;
  platform: string;
  handle: string;
  profileUrl: string;
  followers: string;
  category: string;
  status: string;
  contactType: string;
  contact: string;
  feeKrw: string;
  commissionRate: string;
  rating: string;
  lastContactAt: string;
  tags: string;
  memo: string;
};

export function emptyCreatorForm(): CreatorFormValues {
  return {
    name: "",
    platform: "INSTAGRAM",
    handle: "",
    profileUrl: "",
    followers: "",
    category: "",
    status: "LEAD",
    contactType: "오픈채팅",
    contact: "",
    feeKrw: "",
    commissionRate: "",
    rating: "",
    lastContactAt: "",
    tags: "",
    memo: "",
  };
}

export function creatorToForm(c: CreatorView): CreatorFormValues {
  return {
    name: c.name,
    platform: c.platform,
    handle: c.handle ?? "",
    profileUrl: c.profileUrl ?? "",
    followers: c.followers === null ? "" : String(c.followers),
    category: c.category ?? "",
    status: c.status,
    contactType: c.contactType ?? "",
    contact: c.contact ?? "",
    feeKrw: c.feeKrw === null ? "" : String(c.feeKrw),
    commissionRate: c.commissionRate === null ? "" : String(c.commissionRate),
    rating: c.rating === null ? "" : String(c.rating),
    lastContactAt: toDateInput(c.lastContactAt),
    tags: c.tags ?? "",
    memo: c.memo ?? "",
  };
}

const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-blue-500";
const labelClass = "mb-1 block text-xs text-neutral-400";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {hint && <span className="ml-1.5 text-neutral-600">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function CreatorForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  error,
}: {
  values: CreatorFormValues;
  onChange: (next: CreatorFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  saving: boolean;
  error?: string | null;
}) {
  const [showMore, setShowMore] = useState(false);
  const set = (key: keyof CreatorFormValues) => (value: string) =>
    onChange({ ...values, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="이름 · 활동명" hint="필수">
          <input
            className={inputClass}
            value={values.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="예: 초코맘"
            autoFocus
          />
        </Field>
        <Field label="채널">
          <select
            className={inputClass}
            value={values.platform}
            onChange={(e) => set("platform")(e.target.value)}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="아이디" hint="@ 없이">
          <input
            className={inputClass}
            value={values.handle}
            onChange={(e) => set("handle")(e.target.value)}
            placeholder="choco_mom"
          />
        </Field>
        <Field label="팔로워 수" hint="'1.2만'처럼 적어도 됩니다">
          <input
            className={inputClass}
            value={values.followers}
            onChange={(e) => set("followers")(e.target.value)}
            placeholder="12000"
            inputMode="numeric"
          />
        </Field>
        <Field label="분야" hint="육아 · 주방 · 리빙 …">
          <input
            className={inputClass}
            value={values.category}
            onChange={(e) => set("category")(e.target.value)}
            placeholder="육아"
          />
        </Field>
        <Field label="진행 상태">
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) => set("status")(e.target.value)}
          >
            {CREATOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CREATOR_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="연락 방법">
          <select
            className={inputClass}
            value={values.contactType}
            onChange={(e) => set("contactType")(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="연락처" hint="오픈채팅 주소 · 이메일 등">
          <input
            className={inputClass}
            value={values.contact}
            onChange={(e) => set("contact")(e.target.value)}
            placeholder="https://open.kakao.com/…"
          />
        </Field>
      </div>

      {!showMore && (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="text-xs text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
        >
          단가 · 수수료 · 메모 더 입력하기
        </button>
      )}

      {showMore && (
        <div className="grid gap-3 border-t border-neutral-800 pt-4 sm:grid-cols-2">
          <Field label="진행비" hint="1건당 지급액">
            <input
              className={inputClass}
              value={values.feeKrw}
              onChange={(e) => set("feeKrw")(e.target.value)}
              placeholder="300000"
              inputMode="numeric"
            />
          </Field>
          <Field label="수수료" hint="매출의 몇 %">
            <input
              className={inputClass}
              value={values.commissionRate}
              onChange={(e) => set("commissionRate")(e.target.value)}
              placeholder="10"
              inputMode="decimal"
            />
          </Field>
          <Field label="내 평가" hint="1~5점">
            <select
              className={inputClass}
              value={values.rating}
              onChange={(e) => set("rating")(e.target.value)}
            >
              <option value="">아직 없음</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)} {n}점
                </option>
              ))}
            </select>
          </Field>
          <Field label="마지막 연락일">
            <input
              type="date"
              className={inputClass}
              value={values.lastContactAt}
              onChange={(e) => set("lastContactAt")(e.target.value)}
            />
          </Field>
          <Field label="프로필 링크">
            <input
              className={inputClass}
              value={values.profileUrl}
              onChange={(e) => set("profileUrl")(e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
          <Field label="태그" hint="쉼표로 구분">
            <input
              className={inputClass}
              value={values.tags}
              onChange={(e) => set("tags")(e.target.value)}
              placeholder="반응좋음, 재진행희망"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="메모">
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={values.memo}
                onChange={(e) => set("memo")(e.target.value)}
                placeholder="협의 내용, 주의할 점, 이전 반응 등 자유롭게"
              />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          {saving ? "저장 중…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-neutral-400 hover:text-white"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
