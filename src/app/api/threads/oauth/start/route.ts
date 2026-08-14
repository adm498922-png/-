import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDecryptedSettings } from "@/lib/settings";
import { buildAuthorizeUrl } from "@/lib/threads-api";

export const OAUTH_STATE_COOKIE = "threads_oauth_state";

export async function GET() {
  const settings = await getDecryptedSettings();
  if (
    !settings.threadsAppId ||
    !settings.threadsAppSecret ||
    !settings.threadsRedirectUri
  ) {
    return NextResponse.json(
      { error: "설정 화면에서 Threads 앱 정보를 먼저 입력해주세요." },
      { status: 400 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const authorizeUrl = buildAuthorizeUrl({
    appId: settings.threadsAppId,
    redirectUri: settings.threadsRedirectUri,
    state,
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
