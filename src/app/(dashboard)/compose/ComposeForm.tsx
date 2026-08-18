"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TOPIC_CATEGORIES,
  TONE_OPTIONS,
  ENGAGEMENT_PROMPTS,
  COUPANG_DISCLOSURE,
  buildCoupangComment,
} from "@/lib/daily-post-options";

type Account = { id: string; label: string; username: string | null };
type CoupangLink = {
  id: string;
  productName: string | null;
  originalUrl: string;
  shortUrl: string;
  imageUrl?: string | null;
  videoStatus?: string | null;
  videoUrl?: string | null;
  videoError?: string | null;
};
type ProductSearchResult = {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
};

export default function ComposeForm({
  accounts,
  links,
  aiConfigured,
}: {
  accounts: Account[];
  links: CoupangLink[];
  aiConfigured: boolean;
}) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.map((a) => a.id)
  );
  const [bodyText, setBodyText] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [coupangLinkId, setCoupangLinkId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [links_, setLinks] = useState(links);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ProductSearchResult[] | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{
    productName: string;
    productPrice: number;
    imageUrl: string;
  } | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [perAccountBody, setPerAccountBody] = useState<Record<string, string>>({});
  const [generatingVariantFor, setGeneratingVariantFor] = useState<string | null>(null);
  const [dailyTopic, setDailyTopic] = useState("");
  const [dailyCategory, setDailyCategory] = useState<string | null>(null);
  const [dailyTone, setDailyTone] = useState("반말");
  const [generatingDaily, setGeneratingDaily] = useState(false);
  const [dailyDrafts, setDailyDrafts] = useState<string[] | null>(null);

  const [requestingVideo, setRequestingVideo] = useState(false);
  const [videoRequestError, setVideoRequestError] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadVideoError, setUploadVideoError] = useState<string | null>(null);

  const selectedLink = links_.find((l) => l.id === coupangLinkId) ?? null;

  useEffect(() => {
    if (selectedLink?.videoStatus !== "GENERATING") return;
    const linkId = selectedLink.id;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/coupang/links/${linkId}/video`);
      if (!res.ok) return;
      const updated = await res.json();
      setLinks((prev) => prev.map((l) => (l.id === linkId ? updated : l)));
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedLink?.id, selectedLink?.videoStatus]);

  async function handleRequestVideo() {
    if (!coupangLinkId) return;
    setRequestingVideo(true);
    setVideoRequestError(null);
    const res = await fetch(`/api/coupang/links/${coupangLinkId}/video`, {
      method: "POST",
    });
    const data = await res.json();
    setRequestingVideo(false);
    if (!res.ok) {
      setVideoRequestError(data.error ?? "영상 생성 요청에 실패했습니다.");
      return;
    }
    setLinks((prev) => prev.map((l) => (l.id === coupangLinkId ? data : l)));
  }

  async function handleUploadVideo(file: File) {
    if (!coupangLinkId) return;
    setUploadingVideo(true);
    setUploadVideoError(null);
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch(`/api/coupang/links/${coupangLinkId}/video/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploadingVideo(false);
    if (!res.ok) {
      setUploadVideoError(data.error ?? "영상 업로드에 실패했습니다.");
      return;
    }
    setLinks((prev) => prev.map((l) => (l.id === coupangLinkId ? data : l)));
  }

  async function handleProductSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchKeyword.trim()) return;
    setSearching(true);
    setSearchError(null);
    const res = await fetch("/api/coupang/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: searchKeyword.trim() }),
    });
    setSearching(false);
    const data = await res.json();
    if (!res.ok) {
      setSearchError(data.error ?? "검색에 실패했습니다.");
      setSearchResults(null);
      return;
    }
    // 로켓배송 상품(대체로 판매량이 검증된 상품)을 우선 표시
    const sorted = [...data.products].sort(
      (a: ProductSearchResult, b: ProductSearchResult) =>
        (b.isRocket ? 1 : 0) - (a.isRocket ? 1 : 0)
    );
    setSearchResults(sorted);
  }

  async function handleSelectProduct(product: ProductSearchResult) {
    setSelectingId(product.productId);
    setSearchError(null);
    const res = await fetch("/api/coupang/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: product.productUrl,
        productName: `${product.productName} (${product.productPrice.toLocaleString("ko-KR")}원)`,
        imageUrl: product.productImage,
      }),
    });
    setSelectingId(null);
    const data = await res.json();
    if (!res.ok) {
      setSearchError(data.error ?? "링크 생성에 실패했습니다.");
      return;
    }
    setLinks((prev) => [data, ...prev]);
    setCoupangLinkId(data.id);
    setSelectedProduct({
      productName: product.productName,
      productPrice: product.productPrice,
      imageUrl: product.productImage,
    });
  }

  async function handleGenerateDraft() {
    if (!selectedProduct) return;
    setGeneratingDraft(true);
    setError(null);
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedProduct),
    });
    setGeneratingDraft(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "AI 글 생성에 실패했습니다.");
      return;
    }
    setBodyText(data.body);
  }

  async function handleGenerateDaily(e: React.FormEvent) {
    e.preventDefault();
    setGeneratingDaily(true);
    setError(null);
    setDailyDrafts(null);
    const res = await fetch("/api/ai/daily-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: dailyTopic.trim() || undefined,
        category: dailyCategory || undefined,
        tone: dailyTone,
      }),
    });
    setGeneratingDaily(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "AI 글 생성에 실패했습니다.");
      return;
    }
    setDailyDrafts(data.drafts);
  }

  function updateDailyDraft(index: number, value: string) {
    setDailyDrafts((prev) =>
      prev ? prev.map((d, i) => (i === index ? value : d)) : prev
    );
  }

  function handleUseDailyDraft(index: number) {
    const draft = dailyDrafts?.[index];
    if (draft === undefined) return;
    setBodyText(draft);
    setSelectedProduct(null);
    setCoupangLinkId("");
    setDailyDrafts(null);
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    setPerAccountBody((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: bodyText };
    });
  }

  async function handleGenerateVariant(accountId: string) {
    if (!selectedProduct) return;
    setGeneratingVariantFor(accountId);
    setError(null);
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedProduct),
    });
    setGeneratingVariantFor(null);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "AI 글 생성에 실패했습니다.");
      return;
    }
    setPerAccountBody((prev) => ({ ...prev, [accountId]: data.body }));
  }

  function insertEngagementPrompt() {
    const candidates = ENGAGEMENT_PROMPTS.filter((p) => !commentBody.includes(p));
    const pool = candidates.length > 0 ? candidates : ENGAGEMENT_PROMPTS;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    setCommentBody((prev) => (prev.trim() ? `${prev.trim()}\n${prompt}` : prompt));
  }

  function insertSelectedLink() {
    const link = links_.find((l) => l.id === coupangLinkId);
    if (!link) return;
    const current = commentBody.trim();
    const teaser =
      current && !current.includes(COUPANG_DISCLOSURE)
        ? current
        : ENGAGEMENT_PROMPTS[Math.floor(Math.random() * ENGAGEMENT_PROMPTS.length)];
    setCommentBody(buildCoupangComment(link.shortUrl, teaser));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (selectedAccountIds.length === 0) {
      setError("발행할 계정을 1개 이상 선택해주세요.");
      return;
    }
    if (scheduleMode === "later" && !scheduledAt) {
      setError("예약 시간을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: bodyText,
        commentBody: commentBody || undefined,
        coupangLinkId: coupangLinkId || undefined,
        accountIds: selectedAccountIds,
        accountBodies:
          selectedAccountIds.length > 1 ? perAccountBody : undefined,
        scheduledAt:
          scheduleMode === "later"
            ? new Date(scheduledAt).toISOString()
            : undefined,
      }),
    });
    setSubmitting(false);

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "발행 요청에 실패했습니다.");
      return;
    }

    setSuccessMessage(
      scheduleMode === "now"
        ? "발행 요청됨! \"전체 글\"에서 진행 상태를 확인하세요."
        : "예약됨! \"전체 글\"에서 확인·수정할 수 있어요."
    );
    setBodyText("");
    setCommentBody("");
    setCoupangLinkId("");
    setSelectedProduct(null);
    setPerAccountBody({});
    setScheduleMode("now");
    setScheduledAt("");
  }

  return (
    <div className="space-y-8">
      {aiConfigured && (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold text-neutral-200">
            AI로 일상글 쓰기 (쿠팡 상품 없이)
          </h2>
          <p className="text-xs text-neutral-500">
            소재·말투를 고르고 (비워두면 AI가 알아서 골라요) [AI 일상글 생성]
            누르면, 필요하면 오늘 실제 날씨·이슈를 검색해서 반영한 초안을 3개
            만들어줘요. 쿠팡 링크 홍보 글만 반복되면 부자연스러워 보일 수
            있어, 계정을 자연스럽게 보이려면 일상글도 섞는 걸 추천해요.
          </p>

          <div>
            <p className="mb-1.5 text-xs text-neutral-400">소재 (선택)</p>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setDailyCategory((prev) => (prev === cat ? null : cat))
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    dailyCategory === cat
                      ? "border-purple-500 bg-purple-500/15 text-purple-300"
                      : "border-neutral-700 text-neutral-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-neutral-400">말투</p>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDailyTone(t)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    dailyTone === t
                      ? "border-purple-500 bg-purple-500/15 text-purple-300"
                      : "border-neutral-700 text-neutral-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerateDaily} className="flex gap-2">
            <input
              value={dailyTopic}
              onChange={(e) => setDailyTopic(e.target.value)}
              placeholder="구체적인 소재 직접 입력 (선택, 비워둬도 됨)"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={generatingDaily}
              className="rounded-lg bg-purple-600/20 px-4 py-2 text-sm text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
            >
              {generatingDaily ? "AI 검색·작성 중..." : "✦ AI 일상글 생성"}
            </button>
          </form>
          {dailyDrafts && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">
                초안 {dailyDrafts.length}개 — 직접 고쳐도 되고, 마음에 드는
                걸로 &quot;이 초안 사용&quot;을 눌러주세요.
              </p>
              {dailyDrafts.map((draft, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                >
                  <textarea
                    rows={4}
                    value={draft}
                    onChange={(e) => updateDailyDraft(i, e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleUseDailyDraft(i)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                  >
                    이 초안 사용
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold text-neutral-200">
          쿠팡파트너스 상품 검색
        </h2>
        <form onSubmit={handleProductSearch} className="flex gap-2">
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="찰옥수수"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
          >
            {searching ? "검색 중..." : "검색"}
          </button>
        </form>
        {searchError && <p className="text-sm text-red-400">{searchError}</p>}
        {searchResults && (
          <>
            <p className="text-xs text-neutral-500">
              {searchResults.length}개 상품 찾음 · 원하는 상품을 선택하세요
            </p>
            <div className="space-y-2">
              {searchResults.map((product, i) => (
                <div
                  key={`${product.productId}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">
                      {product.productName}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                      {product.productPrice.toLocaleString("ko-KR")}원
                      {product.isRocket && (
                        <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                          로켓배송
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    disabled={selectingId === product.productId}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {selectingId === product.productId ? "선택 중..." : "이 상품 선택"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5"
      >
        <div>
          <label className="mb-2 block text-xs text-neutral-400">
            발행할 계정
          </label>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <button
                type="button"
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  selectedAccountIds.includes(account.id)
                    ? "border-blue-500 bg-blue-500/15 text-blue-300"
                    : "border-neutral-700 text-neutral-400"
                }`}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        {links_.length > 0 && (
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              쿠팡 링크 삽입 (선택)
            </label>
            <div className="flex gap-2">
              <select
                value={coupangLinkId}
                onChange={(e) => setCoupangLinkId(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">링크 선택 안함</option>
                {links_.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.productName || link.originalUrl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={insertSelectedLink}
                disabled={!coupangLinkId}
                className="rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
              >
                댓글에 삽입
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              본문이 아니라 <strong className="text-neutral-300">자동 첫 댓글</strong>에
              법적 고지 문구와 함께 링크가 들어갑니다 (본문에 링크가 있으면
              노출이 줄어드는 경우가 많아서요).
            </p>
          </div>
        )}

        {selectedProduct && (
          <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.productName}
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
              <p className="text-xs text-neutral-400">
                발행할 때 이 상품 사진이 글에 같이 첨부됩니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-2">
              {selectedLink?.videoStatus === "GENERATING" ? (
                <p className="text-xs text-amber-400">
                  🎬 영상 생성 중... (완료되면 자동으로 이 상품 글에 첨부돼요)
                </p>
              ) : (
                <>
                  {aiConfigured && (
                    <button
                      type="button"
                      onClick={handleRequestVideo}
                      disabled={requestingVideo || uploadingVideo}
                      className="rounded-full bg-purple-600/20 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
                    >
                      {requestingVideo ? "요청 중..." : "🎬 AI 영상도 만들기"}
                    </button>
                  )}
                  <label
                    className={`rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-700 ${
                      uploadingVideo || requestingVideo ? "opacity-50" : "cursor-pointer"
                    }`}
                  >
                    {uploadingVideo ? "업로드 중..." : "📤 내 영상 올리기"}
                    <input
                      type="file"
                      accept="video/mp4"
                      className="hidden"
                      disabled={uploadingVideo || requestingVideo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) handleUploadVideo(file);
                      }}
                    />
                  </label>
                  {selectedLink?.videoStatus !== "READY" && (
                    <p className="text-[11px] text-neutral-500">
                      내 영상은 mp4, 50MB 이하로 올려주세요.
                      {aiConfigured &&
                        " AI 영상은 완성까지 몇 분 걸리고 1개당 OpenAI 요금이 따로 부과돼요."}
                    </p>
                  )}
                </>
              )}
            </div>
            {selectedLink?.videoStatus === "READY" && selectedLink.videoUrl && (
              <div className="flex items-center gap-2">
                <video
                  src={selectedLink.videoUrl}
                  muted
                  className="h-16 w-9 rounded-md bg-black object-cover"
                />
                <p className="text-xs text-green-400">
                  🎬 영상 준비 완료 — 발행 시 사진과 함께 첨부돼요.
                </p>
              </div>
            )}
            {selectedLink?.videoStatus === "FAILED" && selectedLink.videoError && (
              <p className="text-[11px] text-red-400">
                영상 생성 실패: {selectedLink.videoError}
              </p>
            )}
            {videoRequestError && (
              <p className="text-[11px] text-red-400">{videoRequestError}</p>
            )}
            {uploadVideoError && (
              <p className="text-[11px] text-red-400">{uploadVideoError}</p>
            )}
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-neutral-400">본문</label>
            {aiConfigured && selectedProduct && (
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={generatingDraft}
                className="rounded-full bg-purple-600/20 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
              >
                {generatingDraft ? "AI 작성 중..." : "✦ AI 초안 생성"}
              </button>
            )}
          </div>
          <textarea
            required
            rows={5}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="글 내용을 입력하세요"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        {selectedAccountIds.length > 1 && (
          <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-xs text-neutral-400">
              계정별 문구 (비워두면 위 본문이 그대로 사용됩니다 — 여러 계정에
              똑같은 글이 올라가면 반복 게시처럼 보일 수 있어요)
            </p>
            {selectedAccountIds.map((accountId) => {
              const account = accounts.find((a) => a.id === accountId);
              if (!account) return null;
              return (
                <div key={accountId}>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-neutral-400">
                      {account.label}
                    </label>
                    {aiConfigured && selectedProduct && (
                      <button
                        type="button"
                        onClick={() => handleGenerateVariant(accountId)}
                        disabled={generatingVariantFor === accountId}
                        className="rounded-full bg-purple-600/20 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
                      >
                        {generatingVariantFor === accountId
                          ? "AI 작성 중..."
                          : "✦ AI 변형 생성"}
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={perAccountBody[accountId] ?? ""}
                    onChange={(e) =>
                      setPerAccountBody((prev) => ({
                        ...prev,
                        [accountId]: e.target.value,
                      }))
                    }
                    placeholder="비워두면 위 본문 사용"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-neutral-400">
              자동 첫 댓글 (선택)
            </label>
            <button
              type="button"
              onClick={insertEngagementPrompt}
              className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
            >
              참여 유도 문구 추가
            </button>
          </div>
          <textarea
            rows={2}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="본문 발행 직후 자동으로 등록될 댓글"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-neutral-400">발행 시점</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="radio"
                checked={scheduleMode === "now"}
                onChange={() => setScheduleMode("now")}
              />
              즉시 발행
            </label>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="radio"
                checked={scheduleMode === "later"}
                onChange={() => setScheduleMode("later")}
              />
              예약 발행
            </label>
            {scheduleMode === "later" && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {successMessage && (
          <p className="text-sm text-green-400">{successMessage}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting
              ? "처리 중..."
              : scheduleMode === "now"
                ? "지금 발행"
                : "예약하기"}
          </button>
          <Link
            href="/posts"
            className="text-xs text-neutral-400 hover:text-neutral-200 hover:underline"
          >
            전체 글 보기 →
          </Link>
        </div>
      </form>
    </div>
  );
}
