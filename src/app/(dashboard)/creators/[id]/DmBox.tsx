"use client";

import { useState } from "react";
import {
  DEFAULT_DM_TEMPLATE,
  fillDmTemplate,
  instagramDmUrl,
} from "@/lib/dm-template";
import type { CreatorView, ProductView } from "@/lib/gonggu";

function won(value: number | null): string | null {
  return value === null || value === undefined ? null : value.toLocaleString("ko-KR") + "원";
}

/**
 * 공구 제안 DM 도우미.
 *
 * 인스타그램은 다른 사람에게 먼저 DM을 보내는 것을 프로그램으로 막아두었다.
 * 그래서 '자동 전송'은 하지 않고, 문구를 만들어 복사해준 뒤 DM 창만 열어준다.
 * 붙여넣고 보내는 것은 사장님이 직접 한다 — 계정이 막힐 위험이 없다.
 */
export default function DmBox({
  creator,
  products,
  template,
}: {
  creator: CreatorView;
  products: ProductView[];
  template: string | null;
}) {
  const usable = products.filter((p) => p.status === "ACTIVE");
  const [productId, setProductId] = useState(usable[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const product = usable.find((p) => p.id === productId) ?? null;

  // 가벼운 계산이라 그릴 때마다 새로 만든다
  const message = fillDmTemplate(template?.trim() || DEFAULT_DM_TEMPLATE, {
    크리에이터: creator.name,
    아이디: creator.handle,
    상품명: product?.name ?? null,
    브랜드: product?.brand ?? null,
    소비자가: won(product?.retailPrice ?? null),
    공급가: won(product?.supplyPrice ?? null),
    수수료:
      product?.commissionRate === null || product?.commissionRate === undefined
        ? null
        : `${product.commissionRate}%`,
    상품메모: product?.memo ?? null,
  });

  const dmUrl = instagramDmUrl(creator.handle);

  async function copyAndOpen() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setFailed(true);
      return;
    }
    if (dmUrl) window.open(dmUrl, "_blank");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">공구 제안 DM</h2>
        <a
          href="/settings"
          className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-800"
        >
          문구 틀 고치기
        </a>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        상품을 고르면 제안 문구가 만들어집니다. 버튼을 누르면 문구가 복사되고 이
        사람의 DM 창이 열립니다 — 붙여넣고(Ctrl+V) 확인한 뒤 보내시면 됩니다.
      </p>

      {usable.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          제안할 상품이 없습니다. &apos;공구 상품&apos; 화면에서 먼저 등록해주세요.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">제안할 상품</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {usable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand ? `${p.brand} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">보낼 문구</label>
            <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm whitespace-pre-wrap text-slate-800">
              {message}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyAndOpen}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {dmUrl ? "문구 복사하고 DM 열기" : "문구 복사하기"}
            </button>
            {copied && <span className="text-xs text-green-700">복사했습니다</span>}
            {!dmUrl && (
              <span className="text-xs text-slate-500">
                인스타 아이디가 없어서 DM 창은 못 엽니다
              </span>
            )}
          </div>

          {failed && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              브라우저가 복사를 막았습니다. 위 문구를 직접 드래그해서 복사해주세요.
            </div>
          )}

          {product?.proposalFileUrl && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
              <p className="text-xs text-blue-900">
                이 상품에는 업체 제안서 파일이 있습니다. 인스타그램은 파일을 프로그램으로
                자동 첨부하는 걸 막아두어서, 아래에서 내려받은 뒤 DM 창에 직접
                끌어다 놓아(드래그) 함께 보내주세요.
              </p>
              <a
                href={`${product.proposalFileUrl}?download=${encodeURIComponent(
                  product.proposalFileName || "제안서.xlsx"
                )}`}
                className="mt-1.5 inline-block text-xs font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-800"
              >
                📄 {product.proposalFileName || "제안서 파일"} 다운로드
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
