import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * 제안서 원본 파일·상품 이미지처럼, 영상 말고 이런저런 파일을 저장하는 곳.
 * media-storage.ts(영상 전용)와 같은 방식으로 DATABASE_URL 옆에 assets/ 폴더를 둔다.
 * 새 환경변수 없이 그대로 쓴다.
 */
function getAssetsDir(): string {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const dbPath = dbUrl.replace(/^file:/, "");
  const dir = path.join(path.dirname(dbPath), "assets");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/pdf": "pdf",
};

export function extensionFor(mime: string, fallbackName?: string): string {
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const fromName = fallbackName?.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : "bin";
}

/** 파일을 저장하고, 나중에 꺼내올 때 쓸 id(파일명, 확장자 포함)를 돌려준다. */
export function saveAsset(data: Buffer, mime: string, originalName?: string): string {
  const ext = extensionFor(mime, originalName);
  const id = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(getAssetsDir(), id), data);
  return id;
}

export function readAsset(id: string): Buffer | null {
  // 폴더를 벗어나는 경로(../ 등)는 막는다
  if (!/^[a-zA-Z0-9]+\.[a-zA-Z0-9]{1,6}$/.test(id)) return null;
  const filePath = path.join(getAssetsDir(), id);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function assetRoutePath(id: string): string {
  return `/api/assets/${id}`;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export function contentTypeFor(id: string): string {
  const ext = id.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}
