import { NextRequest, NextResponse } from "next/server";
import { getDecryptedSettings } from "@/lib/settings";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getMe,
} from "@/lib/threads-api";
import { saveOrUpdateAccount } from "@/lib/threads-accounts";
import { OAUTH_STATE_COOKIE } from "../start/route";

function redirectWithError(req: NextRequest, message: string) {
  const url = new URL("/accounts", req.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error_message");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (errorParam) {
    return redirectWithError(req, errorParam);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(req, "잘못된 요청이거나 세션이 만료되었습니다. 다시 시도해주세요.");
  }

  const settings = await getDecryptedSettings();
  if (
    !settings.threadsAppId ||
    !settings.threadsAppSecret ||
    !settings.threadsRedirectUri
  ) {
    return redirectWithError(req, "Threads 앱 설정이 없습니다.");
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken({
      appId: settings.threadsAppId,
      appSecret: settings.threadsAppSecret,
      redirectUri: settings.threadsRedirectUri,
      code,
    });

    const longLived = await exchangeForLongLivedToken({
      appSecret: settings.threadsAppSecret,
      shortLivedToken: shortLived.access_token,
    });

    const me = await getMe(longLived.access_token);

    await saveOrUpdateAccount({
      threadsUserId: me.id,
      username: me.username,
      accessToken: longLived.access_token,
      expiresInSeconds: longLived.expires_in,
    });
  } catch (e) {
    console.error("Threads OAuth callback failed", e);
    return redirectWithError(req, "계정 연결에 실패했습니다. 앱 설정을 확인해주세요.");
  }

  const url = new URL("/accounts", req.url);
  url.searchParams.set("connected", "1");
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
