import { prisma } from "./prisma";
import { encrypt, decrypt } from "./crypto";

export type DecryptedSettings = {
  coupangAccessKey: string | null;
  coupangSecretKey: string | null;
  threadsAppId: string | null;
  threadsAppSecret: string | null;
  threadsRedirectUri: string | null;
  openaiApiKey: string | null;
  naverClientId: string | null;
  naverClientSecret: string | null;
  autoDailyPostEnabled: boolean;
  autoDailyPostIncludeProducts: boolean;
};

async function getRow() {
  return prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function getDecryptedSettings(): Promise<DecryptedSettings> {
  const row = await getRow();
  return {
    coupangAccessKey: row.coupangAccessKeyEnc
      ? decrypt(row.coupangAccessKeyEnc)
      : null,
    coupangSecretKey: row.coupangSecretKeyEnc
      ? decrypt(row.coupangSecretKeyEnc)
      : null,
    threadsAppId: row.threadsAppId,
    threadsAppSecret: row.threadsAppSecretEnc
      ? decrypt(row.threadsAppSecretEnc)
      : null,
    threadsRedirectUri: row.threadsRedirectUri,
    openaiApiKey: row.openaiApiKeyEnc ? decrypt(row.openaiApiKeyEnc) : null,
    naverClientId: row.naverClientId,
    naverClientSecret: row.naverClientSecretEnc
      ? decrypt(row.naverClientSecretEnc)
      : null,
    autoDailyPostEnabled: row.autoDailyPostEnabled,
    autoDailyPostIncludeProducts: row.autoDailyPostIncludeProducts,
  };
}

export type SettingsStatus = {
  coupangConfigured: boolean;
  threadsConfigured: boolean;
  aiConfigured: boolean;
  threadsAppId: string | null;
  threadsRedirectUri: string | null;
  coupangAccessKeyPreview: string | null;
  naverConfigured: boolean;
  naverClientId: string | null;
  autoDailyPostEnabled: boolean;
  autoDailyPostIncludeProducts: boolean;
};

export async function getSettingsStatus(): Promise<SettingsStatus> {
  const s = await getDecryptedSettings();
  return {
    coupangConfigured: Boolean(s.coupangAccessKey && s.coupangSecretKey),
    threadsConfigured: Boolean(
      s.threadsAppId && s.threadsAppSecret && s.threadsRedirectUri
    ),
    aiConfigured: Boolean(s.openaiApiKey),
    threadsAppId: s.threadsAppId,
    threadsRedirectUri: s.threadsRedirectUri,
    coupangAccessKeyPreview: s.coupangAccessKey
      ? `${s.coupangAccessKey.slice(0, 4)}••••`
      : null,
    naverConfigured: Boolean(s.naverClientId && s.naverClientSecret),
    naverClientId: s.naverClientId,
    autoDailyPostEnabled: s.autoDailyPostEnabled,
    autoDailyPostIncludeProducts: s.autoDailyPostIncludeProducts,
  };
}

export async function updateSettings(input: {
  coupangAccessKey?: string;
  coupangSecretKey?: string;
  threadsAppId?: string;
  threadsAppSecret?: string;
  threadsRedirectUri?: string;
  openaiApiKey?: string;
  naverClientId?: string;
  naverClientSecret?: string;
  autoDailyPostEnabled?: boolean;
  autoDailyPostIncludeProducts?: boolean;
}) {
  const data: Record<string, string | boolean> = {};
  if (input.coupangAccessKey) data.coupangAccessKeyEnc = encrypt(input.coupangAccessKey);
  if (input.coupangSecretKey) data.coupangSecretKeyEnc = encrypt(input.coupangSecretKey);
  if (input.threadsAppId !== undefined) data.threadsAppId = input.threadsAppId;
  if (input.threadsAppSecret) data.threadsAppSecretEnc = encrypt(input.threadsAppSecret);
  if (input.threadsRedirectUri !== undefined)
    data.threadsRedirectUri = input.threadsRedirectUri;
  if (input.openaiApiKey) data.openaiApiKeyEnc = encrypt(input.openaiApiKey);
  if (input.naverClientId !== undefined) data.naverClientId = input.naverClientId;
  if (input.naverClientSecret) data.naverClientSecretEnc = encrypt(input.naverClientSecret);
  if (input.autoDailyPostEnabled !== undefined)
    data.autoDailyPostEnabled = input.autoDailyPostEnabled;
  if (input.autoDailyPostIncludeProducts !== undefined)
    data.autoDailyPostIncludeProducts = input.autoDailyPostIncludeProducts;

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
}
