import { prisma } from "./prisma";
import { encrypt, decrypt } from "./crypto";

export type DecryptedSettings = {
  coupangAccessKey: string | null;
  coupangSecretKey: string | null;
  threadsAppId: string | null;
  threadsAppSecret: string | null;
  threadsRedirectUri: string | null;
  anthropicApiKey: string | null;
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
    anthropicApiKey: row.anthropicApiKeyEnc
      ? decrypt(row.anthropicApiKeyEnc)
      : null,
  };
}

export type SettingsStatus = {
  coupangConfigured: boolean;
  threadsConfigured: boolean;
  aiConfigured: boolean;
  threadsAppId: string | null;
  threadsRedirectUri: string | null;
  coupangAccessKeyPreview: string | null;
};

export async function getSettingsStatus(): Promise<SettingsStatus> {
  const s = await getDecryptedSettings();
  return {
    coupangConfigured: Boolean(s.coupangAccessKey && s.coupangSecretKey),
    threadsConfigured: Boolean(
      s.threadsAppId && s.threadsAppSecret && s.threadsRedirectUri
    ),
    aiConfigured: Boolean(s.anthropicApiKey),
    threadsAppId: s.threadsAppId,
    threadsRedirectUri: s.threadsRedirectUri,
    coupangAccessKeyPreview: s.coupangAccessKey
      ? `${s.coupangAccessKey.slice(0, 4)}••••`
      : null,
  };
}

export async function updateSettings(input: {
  coupangAccessKey?: string;
  coupangSecretKey?: string;
  threadsAppId?: string;
  threadsAppSecret?: string;
  threadsRedirectUri?: string;
  anthropicApiKey?: string;
}) {
  const data: Record<string, string> = {};
  if (input.coupangAccessKey) data.coupangAccessKeyEnc = encrypt(input.coupangAccessKey);
  if (input.coupangSecretKey) data.coupangSecretKeyEnc = encrypt(input.coupangSecretKey);
  if (input.threadsAppId !== undefined) data.threadsAppId = input.threadsAppId;
  if (input.threadsAppSecret) data.threadsAppSecretEnc = encrypt(input.threadsAppSecret);
  if (input.threadsRedirectUri !== undefined)
    data.threadsRedirectUri = input.threadsRedirectUri;
  if (input.anthropicApiKey) data.anthropicApiKeyEnc = encrypt(input.anthropicApiKey);

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
}
