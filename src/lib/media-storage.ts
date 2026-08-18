import fs from "fs";
import path from "path";

/**
 * SQLite DB와 같은 디렉터리(Railway에서는 영구 볼륨) 밑에 media/ 폴더를 만들어
 * 생성된 영상 파일을 저장한다. 새 환경변수 없이 DATABASE_URL만으로 위치를 정한다.
 */
function getMediaDir(): string {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const dbPath = dbUrl.replace(/^file:/, "");
  const dir = path.join(path.dirname(dbPath), "media");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function videoFileName(linkId: string): string {
  return `${linkId}.mp4`;
}

/**
 * 영상을 다시 올릴 때마다 새 파일 키를 만든다 (linkId만 쓰면 URL이 항상 같아서,
 * Threads(메타) 쪽에서 예전에 실패했던 그 URL을 다시 캐시해서 재시도를 안 할 수 있음).
 */
export function generateVideoFileId(linkId: string): string {
  return `${linkId}${Date.now().toString(36)}`;
}

export function videoFilePath(linkId: string): string {
  return path.join(getMediaDir(), videoFileName(linkId));
}

/** DB에 저장해두는 상대 경로. 실제 발행 시 서버 공개 주소를 앞에 붙여 절대 URL로 사용한다. */
export function videoRoutePath(linkId: string): string {
  return `/api/media/${videoFileName(linkId)}`;
}

export function saveVideoFile(linkId: string, data: Buffer): void {
  fs.writeFileSync(videoFilePath(linkId), data);
}

export function readVideoFile(linkId: string): Buffer | null {
  const filePath = videoFilePath(linkId);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}
