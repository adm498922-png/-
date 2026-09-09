import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { effectiveDealStatus, formatWon, CREATOR_STATUS_LABEL } from "./gonggu";

/**
 * 아침 브리핑 — 오늘 할일·일정, 진행중 공구, 정산 예정, 팔로업 필요한
 * 크리에이터를 모은다. 같은 데이터를 이메일(매일 10시)과 대시보드의
 * "오늘 브리핑" 칸이 함께 쓴다.
 */

// 공구 허브 실제 주소 (메일 안의 바로가기 버튼용)
const SITE_URL = "https://robust-nature-production-5621.up.railway.app";
const FOLLOWUP_DAYS = 3;

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type BriefingData = {
  dateLabel: string;
  todos: { id: string; title: string; date: string; overdue: boolean }[];
  events: { id: string; title: string; date: string; endDate: string | null }[];
  ongoing: { id: string; name: string; startDate: string | null; endDate: string | null }[];
  settle: {
    id: string;
    name: string;
    dueDate: string;
    overdue: boolean;
    settlement: number | null;
  }[];
  followUps: { id: string; name: string; statusLabel: string; days: number }[];
  notes: { id: string; date: string | null; memo: string }[];
};

export async function gatherBriefingData(): Promise<BriefingData> {
  const now = new Date();
  const today = dayStart(now);
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekLater = new Date(today.getTime() + 7 * 86400000);

  const [eventsRaw, deals, creators, notesRaw] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        OR: [
          // 오늘 걸쳐 있는 일정·할일
          { date: { gte: today, lt: tomorrow } },
          { AND: [{ date: { lt: tomorrow } }, { endDate: { gte: today } }] },
          // 날짜 지난 미완료 할일
          { AND: [{ kind: "TODO", done: false, date: { lt: today } }] },
        ],
      },
      orderBy: { date: "asc" },
    }),
    prisma.deal.findMany({
      include: {
        creator: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.creator.findMany({
      where: { status: { in: ["CONTACTED", "CONFIRMED"] } },
    }),
    prisma.settlementNote.findMany({ orderBy: { date: "asc" }, take: 5 }),
  ]);

  const dealName = (d: (typeof deals)[number]) =>
    `${d.creator?.name ?? "?"} · ${d.productName ?? d.product?.name ?? "상품 미지정"}`;

  const todos = eventsRaw
    .filter((e) => e.kind === "TODO" && !e.done)
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date.toISOString(),
      overdue: t.date < today,
    }));

  const events = eventsRaw
    .filter((e) => e.kind !== "TODO")
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      endDate:
        e.endDate && dayStart(e.endDate).getTime() !== dayStart(e.date).getTime()
          ? e.endDate.toISOString()
          : null,
    }));

  const ongoing = deals
    .filter((d) => effectiveDealStatus(d) === "ONGOING")
    .map((d) => ({
      id: d.id,
      name: dealName(d),
      startDate: d.startDate?.toISOString() ?? null,
      endDate: d.endDate?.toISOString() ?? null,
    }));

  const settle = deals
    .filter(
      (d) => d.settleDueDate && !d.settledAt && d.settleDueDate < weekLater
    )
    .sort((a, b) => a.settleDueDate!.getTime() - b.settleDueDate!.getTime())
    .map((d) => ({
      id: d.id,
      name: dealName(d),
      dueDate: d.settleDueDate!.toISOString(),
      overdue: d.settleDueDate! < today,
      settlement: d.settlement,
    }));

  const followUps = creators
    .map((c) => {
      const base = c.lastContactAt ?? c.statusChangedAt ?? c.createdAt;
      const days = Math.floor((now.getTime() - base.getTime()) / 86400000);
      return {
        id: c.id,
        name: c.name,
        statusLabel: CREATOR_STATUS_LABEL[c.status] ?? c.status,
        days,
      };
    })
    .filter((c) => c.days >= FOLLOWUP_DAYS)
    .sort((a, b) => b.days - a.days);

  const notes = notesRaw.map((n) => ({ id: n.id, date: n.date, memo: n.memo }));

  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${"일월화수목금토"[now.getDay()]})`;

  return { dateLabel, todos, events, ongoing, settle, followUps, notes };
}

export async function buildBriefing(): Promise<{ subject: string; html: string }> {
  const data = await gatherBriefingData();

  const section = (title: string, rows: string[], emptyText: string) =>
    `<h3 style="margin:18px 0 6px;font-size:15px;color:#0f172a;">${title}</h3>` +
    (rows.length > 0
      ? `<ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.7;">${rows
          .map((r) => `<li>${r}</li>`)
          .join("")}</ul>`
      : `<p style="margin:0;color:#94a3b8;font-size:13px;">${emptyText}</p>`);

  const html =
    `<div style="max-width:560px;margin:0 auto;font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;background:#ffffff;padding:20px;">` +
    `<h2 style="margin:0 0 2px;font-size:20px;color:#0f172a;">☀️ Y글로벌 아침 브리핑</h2>` +
    `<p style="margin:0 0 4px;color:#64748b;font-size:13px;">${data.dateLabel}</p>` +
    section(
      `✅ 오늘 할일 (${data.todos.length})`,
      data.todos.map(
        (t) =>
          `${esc(t.title)}${t.overdue ? ` <span style="color:#dc2626;">(${fmtDate(t.date)} 지남)</span>` : ""}`
      ),
      "오늘 할일이 없습니다."
    ) +
    section(
      `📅 오늘 일정 (${data.events.length})`,
      data.events.map(
        (e) => `${esc(e.title)}${e.endDate ? ` (${fmtDate(e.date)}~${fmtDate(e.endDate)})` : ""}`
      ),
      "오늘 일정이 없습니다."
    ) +
    section(
      `🛒 진행중인 공구 (${data.ongoing.length})`,
      data.ongoing.map(
        (d) => `${esc(d.name)} — ${fmtDate(d.startDate)}~${fmtDate(d.endDate)}`
      ),
      "진행중인 공구가 없습니다."
    ) +
    section(
      `💰 정산 챙기기 (${data.settle.length})`,
      data.settle.map((d) =>
        d.overdue
          ? `<span style="color:#dc2626;font-weight:bold;">${esc(d.name)} — 정산 예정 ${fmtDate(d.dueDate)} 지남!</span>` +
            (d.settlement !== null ? ` ${formatWon(d.settlement)}` : "")
          : `${esc(d.name)} — ${fmtDate(d.dueDate)} 정산 예정` +
            (d.settlement !== null ? ` (${formatWon(d.settlement)})` : "")
      ),
      "이번 주 정산 예정이 없습니다."
    ) +
    section(
      `📢 팔로업 필요한 크리에이터 (${data.followUps.length})`,
      data.followUps.map(
        (c) => `${esc(c.name)} (${c.statusLabel}) — 연락한 지 ${c.days}일`
      ),
      "연락이 밀린 크리에이터가 없습니다."
    ) +
    (data.notes.length > 0
      ? section(
          `📝 메모 (${data.notes.length})`,
          data.notes.map(
            (n) =>
              `${n.date ? `[${n.date.slice(5).replace("-", "/")}] ` : ""}${esc(n.memo)}`
          ),
          ""
        )
      : "") +
    `<div style="margin-top:22px;">` +
    `<a href="${SITE_URL}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:bold;">Y글로벌 허브 열기</a>` +
    `</div>` +
    `</div>`;

  const highlights: string[] = [];
  if (data.todos.length > 0) highlights.push(`할일 ${data.todos.length}`);
  if (data.settle.length > 0) highlights.push(`정산 ${data.settle.length}`);
  if (data.followUps.length > 0) highlights.push(`팔로업 ${data.followUps.length}`);
  const subject = `[Y글로벌] ${data.dateLabel} 브리핑${highlights.length > 0 ? ` — ${highlights.join(" · ")}` : ""}`;

  return { subject, html };
}

export type BriefingSendResult = { ok: boolean; message: string };

/** 설정된 지메일로 브리핑을 한 통 보낸다 */
export async function sendDailyBriefing(): Promise<BriefingSendResult> {
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const user = row?.briefingGmailUser?.trim();
  const pass = row?.briefingGmailPassEnc ? decrypt(row.briefingGmailPassEnc) : null;
  if (!user || !pass) {
    return { ok: false, message: "지메일 주소와 앱 비밀번호를 먼저 저장해주세요." };
  }
  const to = row?.briefingTo?.trim() || user;

  const { subject, html } = await buildBriefing();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    // 메일 서버가 응답 없을 때 무한정 기다리지 않게 한다
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    await transporter.sendMail({
      from: `"Y글로벌 허브" <${user}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("Invalid login") || msg.includes("Username and Password")) {
      return {
        ok: false,
        message:
          "지메일 로그인에 실패했습니다. 앱 비밀번호(일반 비밀번호 아님)를 다시 확인해주세요.",
      };
    }
    return { ok: false, message: `메일을 보내지 못했습니다: ${msg.slice(0, 120)}` };
  }
  return { ok: true, message: `${to} 로 브리핑을 보냈습니다.` };
}
