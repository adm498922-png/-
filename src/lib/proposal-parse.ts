import OpenAI from "openai";
import { getDecryptedSettings } from "./settings";

/**
 * 업체가 보낸 상품제안서(엑셀)에서 뽑아낸 글자 뭉치를 AI로 항목별로 나눈다.
 *
 * 업체마다 양식이 제각각이라(칸 위치가 다 다르다) 정해진 칸을 읽지 않고,
 * xlsx-read.ts가 뽑아준 텍스트 전체를 AI에게 주고 알아서 나누게 한다.
 */

export type ParsedProposal = {
  name: string | null;
  brand: string | null;
  retailPrice: number | null;
  supplyPrice: number | null;
  vendorCompany: string | null;
  vendorContact: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
  shippingFee: string | null;
  returnPolicy: string | null;
  asInfo: string | null;
  settlementSchedule: string | null;
  origin: string | null;
  composition: string | null;
  material: string | null;
  sizeWeight: string | null;
  noticeExtra: string | null;
};

const SYSTEM_PROMPT = `너는 업체(제조사/벤더)가 보낸 공동구매 상품제안서 엑셀에서 뽑아낸 텍스트를 정리하는 도우미다.
이 텍스트는 엑셀 표를 줄 단위로 그대로 읽은 것이라 칸이 어긋나 있을 수 있다. 문맥으로 알아서 판단한다.

아래 항목만 뽑아 JSON으로 답한다.

- name: 상품명(품명). "상품정보고시"의 상품명이 더 정확하면 그쪽을 우선한다.
- brand: 브랜드명. 보통 상호명과 같거나 상호명에서 (주)/㈜ 등을 뗀 이름.
- retailPrice: 소비자가 / 공구 판매가(원). VAT 포함 금액. 숫자만.
- supplyPrice: 내가 받을 공급가(원). "벤더공급가"와 "셀러공급가"가 둘 다 있으면 셀러공급가(더 낮은 쪽, 최종 마진 계산의 기준)를 우선한다. 헷갈리면 null.
- vendorCompany: 업체 상호명 (예: (주)바이탈플랜트).
- vendorContact: 담당자 이름 — 발주/영업 담당자를 우선. "이름/전화번호" 형태면 이름만.
- vendorPhone: 담당자 전화번호 또는 대표 전화번호. 여러 개면 발주 담당자 것 우선.
- vendorEmail: 담당자 이메일 또는 대표 이메일.
- shippingFee: 배송비 관련 문구를 그대로 (배송비, 도서산간 추가비 등을 자연스럽게 이어서 한 문단으로).
- returnPolicy: 교환/반품 조건 문구.
- asInfo: A/S 정보 및 처리기간.
- settlementSchedule: 정산 일정 문구.
- origin: 원산지.
- composition: 구성품 (예: "팬1개, 이중회전날개1개, ...").
- material: 소재/재질.
- sizeWeight: 제품 크기/중량.
- noticeExtra: 위 항목에 안 들어가는 상품정보고시 내용(건전지, 권장용량, 인증번호 등)을 "라벨: 값" 형태로 줄바꿈해서 모아준다. 없으면 null.

규칙:
- 확실하지 않으면 null. 지어내지 않는다.
- 금액은 쉼표·단위 빼고 숫자만.
- 설명·인사말·코드펜스 없이 JSON만 출력한다.

출력 형식:
{"name":"","brand":"","retailPrice":null,"supplyPrice":null,"vendorCompany":"","vendorContact":"","vendorPhone":"","vendorEmail":"","shippingFee":"","returnPolicy":"","asInfo":"","settlementSchedule":"","origin":"","composition":"","material":"","sizeWeight":"","noticeExtra":""}`;

function friendlyAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/401|invalid_api_key|incorrect api key/i.test(message)) {
    return "AI 키가 올바르지 않습니다. 연결 설정 화면에서 OpenAI 키를 다시 넣어주세요.";
  }
  if (/quota|billing|insufficient_quota/i.test(message)) {
    return "OpenAI 사용 한도가 다 됐거나 결제가 필요합니다. OpenAI 계정을 확인해주세요.";
  }
  if (/429|rate limit/i.test(message)) {
    return "AI 요청이 잠시 몰렸습니다. 몇 초 뒤에 다시 시도해주세요.";
  }
  return "AI에 연결하지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해주세요.";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[,\s원]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export async function parseProposalText(text: string): Promise<ParsedProposal> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("제안서에서 읽을 수 있는 글자가 없습니다.");
  }

  const settings = await getDecryptedSettings();
  if (!settings.openaiApiKey) {
    throw new Error(
      "AI 키가 없어서 제안서 자동 정리를 쓸 수 없습니다. 연결 설정 화면에서 OpenAI 키를 먼저 넣어주세요."
    );
  }

  const client = new OpenAI({ apiKey: settings.openaiApiKey });

  let response;
  try {
    response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed.slice(0, 8000) },
      ],
    });
  } catch (err) {
    throw new Error(friendlyAiError(err));
  }

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI가 제안서 내용을 읽지 못했습니다. 직접 입력해주세요.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 이해하지 못했습니다. 직접 입력해주세요.");
  }

  return {
    name: toText(parsed.name),
    brand: toText(parsed.brand),
    retailPrice: toNumber(parsed.retailPrice),
    supplyPrice: toNumber(parsed.supplyPrice),
    vendorCompany: toText(parsed.vendorCompany),
    vendorContact: toText(parsed.vendorContact),
    vendorPhone: toText(parsed.vendorPhone),
    vendorEmail: toText(parsed.vendorEmail),
    shippingFee: toText(parsed.shippingFee),
    returnPolicy: toText(parsed.returnPolicy),
    asInfo: toText(parsed.asInfo),
    settlementSchedule: toText(parsed.settlementSchedule),
    origin: toText(parsed.origin),
    composition: toText(parsed.composition),
    material: toText(parsed.material),
    sizeWeight: toText(parsed.sizeWeight),
    noticeExtra: toText(parsed.noticeExtra),
  };
}
