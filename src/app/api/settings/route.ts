import { NextRequest, NextResponse } from "next/server";
import { getSettingsStatus, updateSettings } from "@/lib/settings";

export async function GET() {
  const status = await getSettingsStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await updateSettings({
    coupangAccessKey: body.coupangAccessKey || undefined,
    coupangSecretKey: body.coupangSecretKey || undefined,
    threadsAppId: body.threadsAppId,
    threadsAppSecret: body.threadsAppSecret || undefined,
    threadsRedirectUri: body.threadsRedirectUri,
    openaiApiKey: body.openaiApiKey || undefined,
    naverClientId: body.naverClientId,
    naverClientSecret: body.naverClientSecret || undefined,
    autoDailyPostEnabled:
      typeof body.autoDailyPostEnabled === "boolean"
        ? body.autoDailyPostEnabled
        : undefined,
    autoDailyPostIncludeProducts:
      typeof body.autoDailyPostIncludeProducts === "boolean"
        ? body.autoDailyPostIncludeProducts
        : undefined,
  });
  const status = await getSettingsStatus();
  return NextResponse.json(status);
}
