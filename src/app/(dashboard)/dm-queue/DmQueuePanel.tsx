"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DM_QUEUE_PLACEHOLDERS,
  DM_QUEUE_PRESETS,
  estimateAdFee,
  fillCampaignDmTemplate,
  instagramDmUrl,
  type CampaignDmValues,
} from "@/lib/campaign-dm-template";
import { formatFollowers } from "@/lib/gonggu";
import { CAMPAIGN_TYPE_LABEL, campaignSummaryLine, type CampaignAssignmentView, type CampaignView } from "@/lib/campaign";

type TemplateOption = { id: string; name: string; body: string };
type CampaignOption = { id: string; name: string; brand: string; type: string };

const inputClass =
  "rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";

function buildValues(campaign: CampaignView | null, a: CampaignAssignmentView): CampaignDmValues {
  const c = a.creator;
  const followers = c?.followers ?? 0;
  const base: CampaignDmValues = {
    핸들: c?.handle ? `@${c.handle}` : c?.name ?? "",
    이름: c?.name ?? "",
    팔로워: followers.toLocaleString("ko-KR"),
    게시물수: (c?.postCount ?? 0).toLocaleString("ko-KR"),
    참여율: c?.engagementRate ? `${c.engagementRate}%` : "",
    캠페인명: "",
    브랜드: "",
    카테고리: c?.category ?? "",
    혜택: "",
    광고비: "",
    업로드기간: "",
    제품제공: "",
    이차활용: "",
    판매가: "",
    수수료: "",
    목표수량: "",
    진행기간: "",
  };
  if (!campaign) return base;

  base.캠페인명 = campaign.name;
  base.브랜드 = campaign.brand;
  base.카테고리 = campaign.category || base.카테고리;

  if (campaign.type === "AD") {
    base.광고비 = estimateAdFee(followers);
    base.업로드기간 = campaign.period || "협의";
    base.제품제공 = campaign.productShip ? "제품 샘플 제공" : "제품 제공 없음";
    base.이차활용 = campaign.secondaryUse ? "2차 활용 희망" : "";
  } else {
    let priceInfo = "";
    if (campaign.salePrice && campaign.listPrice) {
      const dc = Math.round((1 - campaign.salePrice / campaign.listPrice) * 100);
      priceInfo = `${campaign.salePrice.toLocaleString("ko-KR")}원 (정가 ${campaign.listPrice.toLocaleString("ko-KR")}원 · ${dc}% 할인)`;
    } else if (campaign.salePrice) {
      priceInfo = `${campaign.salePrice.toLocaleString("ko-KR")}원`;
    }
    base.판매가 = priceInfo;
    base.수수료 = campaign.commissionRate ? `${campaign.commissionRate}%` : "";
    base.목표수량 = campaign.targetQty ? `${campaign.targetQty.toLocaleString("ko-KR")}개` : "";
    base.진행기간 =
      campaign.collabStart && campaign.collabEnd
        ? `${String(campaign.collabStart).slice(0, 10)} ~ ${String(campaign.collabEnd).slice(0, 10)}`
        : "";
    base.혜택 = campaign.promo || "";
  }
  return base;
}

export default function DmQueuePanel({
  campaignOptions,
  templates: initialTemplates,
  selectedCampaign,
}: {
  campaignOptions: CampaignOption[];
  templates: TemplateOption[];
  selectedCampaign: CampaignView | null;
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<CampaignAssignmentView[]>(
    selectedCampaign?.assignments ?? []
  );
  const [templates, setTemplates] = useState(initialTemplates);
  const [templateBody, setTemplateBody] = useState<string>(DM_QUEUE_PRESETS.general);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...assignments];
    list.sort((a, b) => (a.status === "SENT" ? 1 : 0) - (b.status === "SENT" ? 1 : 0));
    return list;
  }, [assignments]);

  const total = assignments.length;
  const sentCount = assignments.filter((a) => a.status === "SENT").length;
  const pct = total ? Math.round((sentCount / total) * 100) : 0;

  const firstTarget = sorted[0];
  const preview = firstTarget
    ? fillCampaignDmTemplate(templateBody, buildValues(selectedCampaign, firstTarget))
    : null;

  function loadPreset(kind: keyof typeof DM_QUEUE_PRESETS) {
    setTemplateBody(DM_QUEUE_PRESETS[kind]);
    setSelectedTemplateId("");
  }

  function loadCustomTemplate(id: string) {
    setSelectedTemplateId(id);
    if (!id) return;
    const t = templates.find((t) => t.id === id);
    if (t) setTemplateBody(t.body);
  }

  async function saveCurrentAsTemplate() {
    if (!templateBody.trim()) return;
    const name = prompt("템플릿 이름을 입력하세요:", "");
    if (!name || !name.trim()) return;
    const res = await fetch("/api/dm-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), body: templateBody }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      alert(data?.error ?? "저장하지 못했습니다.");
      return;
    }
    setTemplates((prev) => [data, ...prev]);
    setSelectedTemplateId(data.id);
  }

  async function deleteCurrentTemplate() {
    if (!selectedTemplateId) return;
    const t = templates.find((t) => t.id === selectedTemplateId);
    if (!t || !confirm(`"${t.name}" 템플릿을 삭제할까요?`)) return;
    await fetch(`/api/dm-templates/${selectedTemplateId}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((x) => x.id !== selectedTemplateId));
    setSelectedTemplateId("");
  }

  async function sendAndCopy(a: CampaignAssignmentView) {
    const message = fillCampaignDmTemplate(templateBody, buildValues(selectedCampaign, a));
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(a.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      // 클립보드 실패해도 DM 창은 열어준다
    }
    const url = instagramDmUrl(a.creator?.handle);
    if (url) window.open(url, "_blank");
  }

  async function markStatus(a: CampaignAssignmentView, status: "SENT" | "PENDING") {
    if (!selectedCampaign) return;
    setBusyId(a.id);
    const res = await fetch(`/api/campaigns/${selectedCampaign.id}/assignments/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) return;
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? data : x)));
  }

  async function removeAssignment(a: CampaignAssignmentView) {
    if (!selectedCampaign) return;
    if (!confirm(`${a.creator?.name ?? "이 크리에이터"}를 발송 대상에서 제외할까요?`)) return;
    await fetch(`/api/campaigns/${selectedCampaign.id}/assignments/${a.id}`, { method: "DELETE" });
    setAssignments((prev) => prev.filter((x) => x.id !== a.id));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="mb-1 block text-xs text-slate-500">캠페인 선택</label>
        <select
          className={`${inputClass} w-full max-w-md`}
          value={selectedCampaign?.id ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            router.push(id ? `/dm-queue?campaign=${id}` : "/dm-queue");
          }}
        >
          <option value="">캠페인을 선택하세요</option>
          {campaignOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.type === "AD" ? "📢" : "🛒"} {c.name} ({c.brand})
            </option>
          ))}
        </select>
        {selectedCampaign && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-sm text-slate-900">
              {CAMPAIGN_TYPE_LABEL[selectedCampaign.type]} · {selectedCampaign.name}
            </strong>
            <br />
            브랜드 {selectedCampaign.brand}
            {campaignSummaryLine(selectedCampaign) ? ` · ${campaignSummaryLine(selectedCampaign)}` : ""}
            <br />
            배정된 크리에이터 <strong className="text-blue-600">{total}명</strong>
          </div>
        )}
      </div>

      {!selectedCampaign ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-500">
          캠페인을 먼저 선택하면 배정된 크리에이터 목록이 나타납니다.
          <br />
          <span className="text-xs">배정은 캠페인 목록의 &apos;매칭&apos; 화면에서 할 수 있습니다.</span>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">DM 템플릿</h2>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => loadPreset("general")}
                  className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                >
                  일반
                </button>
                <button
                  onClick={() => loadPreset("ad")}
                  className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                >
                  광고
                </button>
                <button
                  onClick={() => loadPreset("collab")}
                  className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
                >
                  공구/협업
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5">
              <span className="text-xs font-semibold text-slate-500">📚 내 템플릿</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => loadCustomTemplate(e.target.value)}
                className={`${inputClass} min-w-40 flex-1 py-1.5 text-xs`}
              >
                <option value="">저장된 템플릿 선택...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    📄 {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={saveCurrentAsTemplate}
                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                + 현재 내용 저장
              </button>
              {selectedTemplateId && (
                <button
                  onClick={deleteCurrentTemplate}
                  className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  삭제
                </button>
              )}
            </div>

            <textarea
              className={`${inputClass} min-h-40 w-full resize-y`}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              사용 가능한 자리표시자:{" "}
              {DM_QUEUE_PLACEHOLDERS.map((p) => (
                <code key={p} className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-blue-600">
                  {`{${p}}`}
                </code>
              ))}
            </p>

            {preview && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-slate-600">미리보기 (첫 번째 대상 기준)</p>
                <pre className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm whitespace-pre-wrap text-slate-800">
                  {preview}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">발송 진행 상황</h2>
              <span className="text-xs text-slate-500">
                전체 {total} · 완료 {sentCount} · 대기 {total - sentCount}
              </span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>

            {sorted.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
                배정된 크리에이터가 없습니다.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {sorted.map((a) => {
                  const sent = a.status === "SENT";
                  const url = instagramDmUrl(a.creator?.handle);
                  return (
                    <li
                      key={a.id}
                      className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 ${
                        sent ? "opacity-60" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-slate-900">
                          {a.creator?.name}
                        </span>
                        {a.creator?.handle && (
                          <span className="ml-1.5 text-xs text-slate-400">@{a.creator.handle}</span>
                        )}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatFollowers(a.creator?.followers)} 팔로워
                        </span>
                        {sent && (
                          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                            발송됨
                          </span>
                        )}
                      </div>
                      {sent ? (
                        <button
                          onClick={() => markStatus(a, "PENDING")}
                          disabled={busyId === a.id}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
                          title="발송 완료 취소"
                        >
                          ↩ 되돌리기
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => sendAndCopy(a)}
                            disabled={!url}
                            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                          >
                            {copiedId === a.id ? "복사됨 ✓" : "복사+DM"}
                          </button>
                          <button
                            onClick={() => markStatus(a, "SENT")}
                            disabled={busyId === a.id}
                            className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                            title="이미 발송했으면 바로 완료 처리"
                          >
                            완료
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => removeAssignment(a)}
                        className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-red-600"
                        title="발송 대상에서 제외"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
