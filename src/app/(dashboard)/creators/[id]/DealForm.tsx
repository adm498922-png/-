"use client";

import { useState } from "react";
import {
  DEAL_STATUSES,
  DEAL_STATUS_LABEL,
  PRODUCT_STATUS_LABEL,
  effectiveDealStatus,
  toDateInput,
  type DealView,
  type ProductView,
} from "@/lib/gonggu";

export type DealFormValues = {
  productId: string;
  productName: string;
  status: string;
  startDate: string;
  endDate: string;
  unitsSold: string;
  revenue: string;
  settlement: string;
  commissionRate: string;
  salesCommission: string;
  contentFee: string;
  agencyRate: string;
  agencyFee: string;
  settleDueDate: string;
  settledAt: string;
  linkSent: boolean;
  taxReported: boolean;
  statementIssued: boolean;
  memo: string;
};

export function emptyDealForm(): DealFormValues {
  return {
    productId: "",
    productName: "",
    status: "PLANNED",
    startDate: "",
    endDate: "",
    unitsSold: "",
    revenue: "",
    settlement: "",
    commissionRate: "",
    salesCommission: "",
    contentFee: "",
    agencyRate: "",
    agencyFee: "",
    settleDueDate: "",
    settledAt: "",
    linkSent: false,
    taxReported: false,
    statementIssued: false,
    memo: "",
  };
}

export function dealToForm(d: DealView): DealFormValues {
  return {
    productId: d.productId ?? "",
    productName: d.productName ?? "",
    // 수정 폼을 열 때도 날짜 기준으로 자동 계산된 상태를 보여준다
    status: effectiveDealStatus(d),
    startDate: toDateInput(d.startDate),
    endDate: toDateInput(d.endDate),
    unitsSold: d.unitsSold === null ? "" : String(d.unitsSold),
    revenue: d.revenue === null ? "" : String(d.revenue),
    settlement: d.settlement === null ? "" : String(d.settlement),
    commissionRate: d.commissionRate === null ? "" : String(d.commissionRate),
    salesCommission: d.salesCommission === null ? "" : String(d.salesCommission),
    contentFee: d.contentFee === null ? "" : String(d.contentFee),
    agencyRate: d.agencyRate === null ? "" : String(d.agencyRate),
    agencyFee: d.agencyFee === null ? "" : String(d.agencyFee),
    settleDueDate: toDateInput(d.settleDueDate),
    settledAt: toDateInput(d.settledAt),
    linkSent: d.linkSent,
    taxReported: d.taxReported,
    statementIssued: d.statementIssued,
    memo: d.memo ?? "",
  };
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";
const labelClass = "mb-1 block text-xs text-slate-500";

export default function DealForm({
  values,
  products,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  error,
}: {
  values: DealFormValues;
  products: ProductView[];
  onChange: (next: DealFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  saving: boolean;
  error?: string | null;
}) {
  const [showSettle, setShowSettle] = useState(false);
  const set = (key: keyof DealFormValues) => (value: string) =>
    onChange({ ...values, [key]: value });
  const toggle = (key: keyof DealFormValues) => (value: boolean) =>
    onChange({ ...values, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>상품</label>
          <select
            className={inputClass}
            value={values.productId}
            onChange={(e) => set("productId")(e.target.value)}
          >
            <option value="">직접 입력</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.status === "ACTIVE" ? "" : ` (${PRODUCT_STATUS_LABEL[p.status] ?? p.status})`}
              </option>
            ))}
          </select>
        </div>
        {!values.productId && (
          <div>
            <label className={labelClass}>
              상품명 <span className="ml-1 text-slate-400">직접 입력</span>
            </label>
            <input
              className={inputClass}
              value={values.productName}
              onChange={(e) => set("productName")(e.target.value)}
              placeholder="예: 유기농 이유식 세트"
            />
          </div>
        )}
        <div>
          <label className={labelClass}>
            진행 상태
            <span className="ml-1.5 text-slate-400">
              시작일·종료일을 넣으면 날짜에 맞춰 자동으로 바뀌어요
            </span>
          </label>
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) => set("status")(e.target.value)}
          >
            {DEAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DEAL_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>시작일</label>
          <input
            type="date"
            className={inputClass}
            value={values.startDate}
            onChange={(e) => set("startDate")(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>종료일</label>
          <input
            type="date"
            className={inputClass}
            value={values.endDate}
            onChange={(e) => set("endDate")(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>판매 수량</label>
          <input
            className={inputClass}
            value={values.unitsSold}
            onChange={(e) => set("unitsSold")(e.target.value)}
            placeholder="120"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={labelClass}>매출</label>
          <input
            className={inputClass}
            value={values.revenue}
            onChange={(e) => set("revenue")(e.target.value)}
            placeholder="3600000"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={labelClass}>
            크리에이터 지급액 <span className="ml-1 text-slate-400">정산</span>
          </label>
          <input
            className={inputClass}
            value={values.settlement}
            onChange={(e) => set("settlement")(e.target.value)}
            placeholder="360000"
            inputMode="numeric"
          />
        </div>
      </div>
      {!showSettle ? (
        <button
          type="button"
          onClick={() => setShowSettle(true)}
          className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-700"
        >
          정산 · 세금 항목 입력하기
        </button>
      ) : (
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                인플루언서 수수료율 <span className="ml-1 text-slate-400">%</span>
              </label>
              <input
                className={inputClass}
                value={values.commissionRate}
                onChange={(e) => set("commissionRate")(e.target.value)}
                placeholder="15"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>판매 수수료 <span className="ml-1 text-slate-400">세전</span></label>
              <input
                className={inputClass}
                value={values.salesCommission}
                onChange={(e) => set("salesCommission")(e.target.value)}
                placeholder="493500"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>콘텐츠 제작비</label>
              <input
                className={inputClass}
                value={values.contentFee}
                onChange={(e) => set("contentFee")(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>
                우리 수수료율 <span className="ml-1 text-slate-400">%</span>
              </label>
              <input
                className={inputClass}
                value={values.agencyRate}
                onChange={(e) => set("agencyRate")(e.target.value)}
                placeholder="10"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>우리 수수료 금액</label>
              <input
                className={inputClass}
                value={values.agencyFee}
                onChange={(e) => set("agencyFee")(e.target.value)}
                placeholder="329000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>정산 예정일</label>
              <input
                type="date"
                className={inputClass}
                value={values.settleDueDate}
                onChange={(e) => set("settleDueDate")(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>정산 완료일</label>
              <input
                type="date"
                className={inputClass}
                value={values.settledAt}
                onChange={(e) => set("settledAt")(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            {(
              [
                ["linkSent", "링크 전달"],
                ["taxReported", "세금신고"],
                ["statementIssued", "간이지급명세서"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values[key]}
                  onChange={(e) => toggle(key)(e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>메모</label>
        <textarea
          className={`${inputClass} min-h-16 resize-y`}
          value={values.memo}
          onChange={(e) => set("memo")(e.target.value)}
          placeholder="반응, 재진행 의사, 특이사항"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
        >
          {saving ? "저장 중…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          취소
        </button>
      </div>
    </form>
  );
}
