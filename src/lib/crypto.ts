import crypto from "crypto";

function getKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "APP_SECRET 환경변수가 설정되지 않았거나 너무 짧습니다 (.env 파일 확인)"
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

const IV_LENGTH = 12;

export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = raw.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** 설정 화면 등에서 "저장된 값이 있음"만 보여줄 때 쓰는 마스킹 */
export function maskSecret(plainText: string): string {
  if (plainText.length <= 8) return "••••••••";
  return `${plainText.slice(0, 4)}••••${plainText.slice(-4)}`;
}
