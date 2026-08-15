import { prisma } from "./prisma";
import { encrypt, decrypt } from "./crypto";
import { refreshLongLivedToken } from "./threads-api";

const REFRESH_MARGIN_MS = 1000 * 60 * 60 * 24 * 7; // 만료 7일 전이면 갱신

export async function saveOrUpdateAccount(params: {
  threadsUserId: string;
  username: string;
  accessToken: string;
  expiresInSeconds: number;
}) {
  const tokenExpiresAt = new Date(Date.now() + params.expiresInSeconds * 1000);
  return prisma.threadsAccount.upsert({
    where: { threadsUserId: params.threadsUserId },
    update: {
      username: params.username,
      accessTokenEnc: encrypt(params.accessToken),
      tokenExpiresAt,
      isActive: true,
    },
    create: {
      threadsUserId: params.threadsUserId,
      username: params.username,
      label: params.username,
      accessTokenEnc: encrypt(params.accessToken),
      tokenExpiresAt,
    },
  });
}

/** Meta가 세션을 무효화했을 때(로그아웃 등) 계정을 재연결 필요 상태로 표시 */
export async function markAccountNeedsReconnect(accountId: string) {
  await prisma.threadsAccount.update({
    where: { id: accountId },
    data: { isActive: false },
  });
}

/** 만료가 임박했으면 자동 갱신 후, 사용 가능한 access token을 반환 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await prisma.threadsAccount.findUniqueOrThrow({
    where: { id: accountId },
  });

  const token = decrypt(account.accessTokenEnc);
  const expiresAt = account.tokenExpiresAt;

  if (!expiresAt || expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) {
    return token;
  }

  const refreshed = await refreshLongLivedToken(token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await prisma.threadsAccount.update({
    where: { id: accountId },
    data: {
      accessTokenEnc: encrypt(refreshed.access_token),
      tokenExpiresAt: newExpiresAt,
    },
  });
  return refreshed.access_token;
}
