"use client";

import { useRef, useState } from "react";
import {
  formatWon,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_CLASS,
  PRODUCT_STATUS_LABEL,
  type ProductView,
} from "@/lib/gonggu";

type FormValues = {
  name: string;
  brand: string;
  status: string;
  retailPrice: string;
  supplyPrice: string;
  commissionRate: string;
  imageUrl: string;
  images: string;
  memo: string;
  vendorCompany: string;
  vendorContact: string;
  vendorPhone: string;
  vendorEmail: string;
  shippingFee: string;
  returnPolicy: string;
  asInfo: string;
  settlementSchedule: string;
  origin: string;
  composition: string;
  material: string;
  sizeWeight: string;
  noticeExtra: string;
  proposalFileUrl: string;
  proposalFileName: string;
};

function emptyForm(): FormValues {
  return {
    name: "",
    brand: "",
    status: "SOURCING",
    retailPrice: "",
    supplyPrice: "",
    commissionRate: "",
    imageUrl: "",
    images: "",
    memo: "",
    vendorCompany: "",
    vendorContact: "",
    vendorPhone: "",
    vendorEmail: "",
    shippingFee: "",
    returnPolicy: "",
    asInfo: "",
    settlementSchedule: "",
    origin: "",
    composition: "",
    material: "",
    sizeWeight: "",
    noticeExtra: "",
    proposalFileUrl: "",
    proposalFileName: "",
  };
}

function toForm(p: ProductView): FormValues {
  return {
    name: p.name,
    brand: p.brand ?? "",
    status: p.status,
    retailPrice: p.retailPrice === null ? "" : String(p.retailPrice),
    supplyPrice: p.supplyPrice === null ? "" : String(p.supplyPrice),
    commissionRate: p.commissionRate === null ? "" : String(p.commissionRate),
    imageUrl: p.imageUrl ?? "",
    images: p.images ?? "",
    memo: p.memo ?? "",
    vendorCompany: p.vendorCompany ?? "",
    vendorContact: p.vendorContact ?? "",
    vendorPhone: p.vendorPhone ?? "",
    vendorEmail: p.vendorEmail ?? "",
    shippingFee: p.shippingFee ?? "",
    returnPolicy: p.returnPolicy ?? "",
    asInfo: p.asInfo ?? "",
    settlementSchedule: p.settlementSchedule ?? "",
    origin: p.origin ?? "",
    composition: p.composition ?? "",
    material: p.material ?? "",
    sizeWeight: p.sizeWeight ?? "",
    noticeExtra: p.noticeExtra ?? "",
    proposalFileUrl: p.proposalFileUrl ?? "",
    proposalFileName: p.proposalFileName ?? "",
  };
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";
const labelClass = "mb-1 block text-xs text-slate-500";

export default function ProductList({
  initialProducts,
}: {
  initialProducts: ProductView[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormValues) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setVendorOpen(false);
    setOpen(true);
  }

  function openEdit(p: ProductView) {
    setEditingId(p.id);
    setForm(toForm(p));
    setError(null);
    setVendorOpen(Boolean(p.vendorCompany || p.proposalFileUrl));
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      editingId ? `/api/products/${editingId}` : "/api/products",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setProducts((prev) =>
      editingId ? prev.map((p) => (p.id === editingId ? data : p)) : [data, ...prev]
    );
    setOpen(false);
    setEditingId(null);
  }

  async function changeStatus(p: ProductView, status: string) {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? data : x)));
  }

  async function handleDelete(p: ProductView) {
    if (!confirm(`'${p.name}' 상품을 지울까요?`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (data?.softDeleted) {
      setNotice(data.message);
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: "ENDED" } : x))
      );
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  async function handleProposalFile(file: File) {
    setProposalLoading(true);
    setError(null);
    setNotice(null);
    const buf = await file.arrayBuffer();
    const res = await fetch("/api/products/import-proposal", {
      method: "POST",
      headers: {
        "Content-Type": XLSX_MIME,
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: buf,
    });
    const data = await res.json().catch(() => null);
    setProposalLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      setError(data?.error ?? "제안서를 읽지 못했습니다.");
      setOpen(true);
      return;
    }

    const draft = data.draft ?? {};
    setEditingId(null);
    setForm({
      ...emptyForm(),
      name: draft.name ?? "",
      brand: draft.brand ?? "",
      retailPrice: draft.retailPrice != null ? String(draft.retailPrice) : "",
      supplyPrice: draft.supplyPrice != null ? String(draft.supplyPrice) : "",
      imageUrl: data.images?.[0] ?? "",
      images: (data.images ?? []).join(","),
      vendorCompany: draft.vendorCompany ?? "",
      vendorContact: draft.vendorContact ?? "",
      vendorPhone: draft.vendorPhone ?? "",
      vendorEmail: draft.vendorEmail ?? "",
      shippingFee: draft.shippingFee ?? "",
      returnPolicy: draft.returnPolicy ?? "",
      asInfo: draft.asInfo ?? "",
      settlementSchedule: draft.settlementSchedule ?? "",
      origin: draft.origin ?? "",
      composition: draft.composition ?? "",
      material: draft.material ?? "",
      sizeWeight: draft.sizeWeight ?? "",
      noticeExtra: draft.noticeExtra ?? "",
      proposalFileUrl: data.proposalFileUrl ?? "",
      proposalFileName: data.proposalFileName ?? "",
    });
    setVendorOpen(true);
    setOpen(true);
    setNotice(
      "제안서 내용을 아래 칸에 채웠습니다. 틀린 곳이 있으면 고친 뒤 저장하세요."
    );
  }

  // 판매 종료 상품만 맨 아래로 내리고, 그 안에서는 최근 등록·수정순 그대로 둔다.
  const sortedProducts = [...products].sort((a, b) => {
    const aEnded = a.status === "ENDED" ? 1 : 0;
    const bEnded = b.status === "ENDED" ? 1 : 0;
    return aEnded - bEnded;
  });

  const imageList = (p: ProductView) =>
    (p.images ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleProposalFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={proposalLoading}
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
        >
          {proposalLoading ? "제안서 읽는 중…" : "📄 제안서로 상품 추가"}
        </button>
        <button
          onClick={() => (open ? setOpen(false) : openNew())}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {open ? "닫기" : "＋ 상품 추가"}
        </button>
      </div>

      <p className="-mt-2 text-right text-xs text-slate-400">
        업체에서 받은 상품제안서 엑셀 파일을 올리면 AI가 내용을 읽어 아래 칸에 채워줍니다.
      </p>

      {notice && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="font-semibold text-slate-900">
            {editingId ? "상품 수정" : "새 상품 추가"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                상품명 <span className="ml-1 text-slate-400">필수</span>
              </label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="예: 유기농 이유식 세트"
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>브랜드</label>
              <input
                className={inputClass}
                value={form.brand}
                onChange={(e) => set("brand")(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>진행 단계</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => set("status")(e.target.value)}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PRODUCT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>소비자가</label>
              <input
                className={inputClass}
                value={form.retailPrice}
                onChange={(e) => set("retailPrice")(e.target.value)}
                placeholder="30000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>공급가</label>
              <input
                className={inputClass}
                value={form.supplyPrice}
                onChange={(e) => set("supplyPrice")(e.target.value)}
                placeholder="18000"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass}>
                크리에이터 수수료 <span className="ml-1 text-slate-400">%</span>
              </label>
              <input
                className={inputClass}
                value={form.commissionRate}
                onChange={(e) => set("commissionRate")(e.target.value)}
                placeholder="10"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>상품 이미지 주소</label>
              <input
                className={inputClass}
                value={form.imageUrl}
                onChange={(e) => set("imageUrl")(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>메모</label>
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              value={form.memo}
              onChange={(e) => set("memo")(e.target.value)}
              placeholder="재고, 배송 조건, 주의할 점 등"
            />
          </div>

          {form.images.trim() && (
            <div>
              <label className={labelClass}>제안서에서 가져온 상품 사진</label>
              <div className="flex flex-wrap gap-2">
                {form.images
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt="상품 사진"
                      className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                    />
                  ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setVendorOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <span>업체 제안서 정보 (배송 · 교환/반품 · A/S · 정산일정 등)</span>
              <span className="text-slate-400">{vendorOpen ? "접기 ▲" : "펼치기 ▼"}</span>
            </button>
            {vendorOpen && (
              <div className="space-y-3 border-t border-slate-200 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>업체(상호명)</label>
                    <input
                      className={inputClass}
                      value={form.vendorCompany}
                      onChange={(e) => set("vendorCompany")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>담당자</label>
                    <input
                      className={inputClass}
                      value={form.vendorContact}
                      onChange={(e) => set("vendorContact")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>담당자 전화</label>
                    <input
                      className={inputClass}
                      value={form.vendorPhone}
                      onChange={(e) => set("vendorPhone")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>담당자 이메일</label>
                    <input
                      className={inputClass}
                      value={form.vendorEmail}
                      onChange={(e) => set("vendorEmail")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>원산지</label>
                    <input
                      className={inputClass}
                      value={form.origin}
                      onChange={(e) => set("origin")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>소재/재질</label>
                    <input
                      className={inputClass}
                      value={form.material}
                      onChange={(e) => set("material")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>크기/중량</label>
                    <input
                      className={inputClass}
                      value={form.sizeWeight}
                      onChange={(e) => set("sizeWeight")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>구성품</label>
                    <input
                      className={inputClass}
                      value={form.composition}
                      onChange={(e) => set("composition")(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>배송비</label>
                  <textarea
                    className={`${inputClass} min-h-12 resize-y`}
                    value={form.shippingFee}
                    onChange={(e) => set("shippingFee")(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>교환/반품 정책</label>
                  <textarea
                    className={`${inputClass} min-h-12 resize-y`}
                    value={form.returnPolicy}
                    onChange={(e) => set("returnPolicy")(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>A/S 정보</label>
                  <textarea
                    className={`${inputClass} min-h-12 resize-y`}
                    value={form.asInfo}
                    onChange={(e) => set("asInfo")(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>정산 일정</label>
                  <textarea
                    className={`${inputClass} min-h-12 resize-y`}
                    value={form.settlementSchedule}
                    onChange={(e) => set("settlementSchedule")(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>그 외 상품정보고시</label>
                  <textarea
                    className={`${inputClass} min-h-16 resize-y`}
                    value={form.noticeExtra}
                    onChange={(e) => set("noticeExtra")(e.target.value)}
                  />
                </div>
                {form.proposalFileUrl && (
                  <p className="text-xs text-slate-500">
                    원본 제안서 파일:{" "}
                    <a
                      href={`${form.proposalFileUrl}?download=${encodeURIComponent(
                        form.proposalFileName || "제안서.xlsx"
                      )}`}
                      className="text-blue-600 underline underline-offset-4 hover:text-blue-700"
                    >
                      {form.proposalFileName || "다운로드"}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {saving ? "저장 중…" : editingId ? "수정 저장" : "추가하기"}
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

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">아직 등록한 상품이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">
            공구 기록을 남길 때 여기 등록한 상품을 골라 쓸 수 있습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedProducts.map((p) => (
            <li
              key={p.id}
              className={`rounded-xl border border-slate-200 bg-white p-4 ${
                p.status === "ENDED" ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{p.name}</span>
                {p.brand && <span className="text-xs text-slate-500">{p.brand}</span>}
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    PRODUCT_STATUS_CLASS[p.status] ?? "bg-slate-100 text-slate-500"
                  }`}
                >
                  {PRODUCT_STATUS_LABEL[p.status] ?? p.status}
                </span>
                <span className="ml-auto flex gap-2 text-[11px] text-slate-500">
                  <button onClick={() => openEdit(p)} className="hover:text-slate-900">
                    수정
                  </button>
                  {p.status === "SOURCING" && (
                    <button
                      onClick={() => changeStatus(p, "ACTIVE")}
                      className="hover:text-slate-900"
                    >
                      공구 가능으로 전환
                    </button>
                  )}
                  {p.status !== "ENDED" && (
                    <button
                      onClick={() => changeStatus(p, "ENDED")}
                      className="hover:text-slate-900"
                    >
                      판매 종료
                    </button>
                  )}
                  {p.status === "ENDED" && (
                    <button
                      onClick={() => changeStatus(p, "ACTIVE")}
                      className="hover:text-slate-900"
                    >
                      다시 열기
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p)}
                    className="hover:text-red-700"
                  >
                    삭제
                  </button>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>소비자가 {formatWon(p.retailPrice)}</span>
                <span>공급가 {formatWon(p.supplyPrice)}</span>
                <span>
                  수수료 {p.commissionRate === null ? "-" : `${p.commissionRate}%`}
                </span>
                <span>진행 {p.deals?.length ?? 0}건</span>
                {p.vendorCompany && <span>업체 {p.vendorCompany}</span>}
              </div>
              {p.memo && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500">
                  {p.memo}
                </p>
              )}
              {(imageList(p).length > 0 || p.proposalFileUrl) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {imageList(p)
                    .slice(0, 6)
                    .map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt="상품 사진"
                        className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                      />
                    ))}
                  {p.proposalFileUrl && (
                    <a
                      href={`${p.proposalFileUrl}?download=${encodeURIComponent(
                        p.proposalFileName || "제안서.xlsx"
                      )}`}
                      className="ml-1 text-xs text-blue-600 underline underline-offset-4 hover:text-blue-700"
                    >
                      📄 제안서 원본 다운로드
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
