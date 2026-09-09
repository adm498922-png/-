import { ImapFlow } from "imapflow";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";

/**
 * 오늘 브리핑의 "오늘 온 메일" — 지메일·네이버 메일함에서 최근 24시간 메일의
 * 제목·보낸사람만 읽어온다 (읽음 처리하지 않고 보기만 한다).
 * - 지메일: 아침 브리핑에 쓰는 앱 비밀번호 그대로 사용
 * - 네이버: 네이버 메일 설정에서 IMAP을 켜고 아이디/비밀번호 저장
 */

export type MailMessage = {
  subject: string;
  from: string;
  date: string; // ISO
  unread: boolean;
};

export type MailAccountResult = {
  kind: "gmail" | "naver";
  user: string;
  ok: boolean;
  error?: string;
  unreadCount: number;
  messages: MailMessage[];
};

const MAX_MESSAGES = 6;
const FETCH_TIMEOUT_MS = 15000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function fetchAccount(
  kind: "gmail" | "naver",
  host: string,
  user: string,
  pass: string
): Promise<MailAccountResult> {
  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await withTimeout(client.connect(), FETCH_TIMEOUT_MS);
  } catch (e) {
    const msg = (e as Error).message ?? "";
    const friendly = msg.includes("timeout")
      ? "메일 서버 응답이 없습니다. 잠시 후 다시 시도해주세요."
      : kind === "naver"
        ? "네이버 로그인 실패 — 네이버 메일에서 IMAP을 켰는지, 아이디/비밀번호(2단계 인증이면 애플리케이션 비밀번호)를 확인해주세요."
        : "지메일 로그인 실패 — 앱 비밀번호를 확인해주세요.";
    try {
      client.close();
    } catch {}
    return { kind, user, ok: false, error: friendly, unreadCount: 0, messages: [] };
  }

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const uids = (await withTimeout(
        client.search({ since }, { uid: true }),
        FETCH_TIMEOUT_MS
      )) as number[] | false;

      const list = Array.isArray(uids) ? uids : [];
      const recent = list.slice(-25); // 최근 것만
      const messages: MailMessage[] = [];
      let unreadCount = 0;

      if (recent.length > 0) {
        for await (const msg of client.fetch(
          recent,
          { envelope: true, flags: true },
          { uid: true }
        )) {
          const unread = !(msg.flags?.has("\\Seen") ?? false);
          if (unread) unreadCount++;
          const fromAddr = msg.envelope?.from?.[0];
          const rawDate = msg.envelope?.date;
          const date = rawDate ? new Date(rawDate) : new Date();
          messages.push({
            subject: msg.envelope?.subject ?? "(제목 없음)",
            from: fromAddr?.name || fromAddr?.address || "?",
            date: (Number.isNaN(date.getTime()) ? new Date() : date).toISOString(),
            unread,
          });
        }
      }

      messages.sort((a, b) => b.date.localeCompare(a.date));
      return {
        kind,
        user,
        ok: true,
        unreadCount,
        messages: messages.slice(0, MAX_MESSAGES),
      };
    } finally {
      lock.release();
    }
  } catch {
    return {
      kind,
      user,
      ok: false,
      error: "메일함을 읽지 못했습니다. 잠시 후 다시 시도해주세요.",
      unreadCount: 0,
      messages: [],
    };
  } finally {
    try {
      await withTimeout(client.logout(), 3000);
    } catch {
      try {
        client.close();
      } catch {}
    }
  }
}

/** 설정된 계정들의 최근 메일을 모두 가져온다. 계정이 하나도 없으면 빈 배열. */
export async function fetchRecentMail(): Promise<MailAccountResult[]> {
  const row = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const jobs: Promise<MailAccountResult>[] = [];

  const gmailUser = row?.briefingGmailUser?.trim();
  const gmailPass = row?.briefingGmailPassEnc ? decrypt(row.briefingGmailPassEnc) : null;
  if (gmailUser && gmailPass) {
    jobs.push(fetchAccount("gmail", "imap.gmail.com", gmailUser, gmailPass));
  }

  const naverUser = row?.naverMailUser?.trim();
  const naverPass = row?.naverMailPassEnc ? decrypt(row.naverMailPassEnc) : null;
  if (naverUser && naverPass) {
    // 네이버 IMAP 아이디는 @naver.com 앞부분만 쓴다
    jobs.push(
      fetchAccount("naver", "imap.naver.com", naverUser.replace(/@.*$/, ""), naverPass)
    );
  }

  return Promise.all(jobs);
}
