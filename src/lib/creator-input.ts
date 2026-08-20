import { CREATOR_STATUSES, PLATFORMS, parseNumber } from "@/lib/gonggu";

// 화면에서 넘어온 값(문자열 위주)을 DB에 넣을 형태로 다듬는다.
// 빈 문자열은 null로 바꿔서 "지웠다"는 뜻이 그대로 저장되게 한다.
export function normalizeCreatorInput(input: Record<string, unknown>) {
  const text = (key: string) => {
    const v = input[key];
    if (typeof v !== "string") return undefined;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  };

  const platform =
    typeof input.platform === "string" &&
    (PLATFORMS as readonly string[]).includes(input.platform)
      ? input.platform
      : undefined;
  const status =
    typeof input.status === "string" &&
    (CREATOR_STATUSES as readonly string[]).includes(input.status)
      ? input.status
      : undefined;

  const followers = parseNumber(input.followers);
  const following = parseNumber(input.following);
  const feeKrw = parseNumber(input.feeKrw);
  const commissionRate = parseNumber(input.commissionRate);
  const rating = parseNumber(input.rating);
  const postCount = parseNumber(input.postCount);
  const avgLikes = parseNumber(input.avgLikes);
  const avgComments = parseNumber(input.avgComments);
  const engagementRate = parseNumber(input.engagementRate);
  const synced =
    typeof input.syncedAt === "string" && input.syncedAt.trim()
      ? new Date(input.syncedAt)
      : null;
  const lastContact =
    typeof input.lastContactAt === "string" && input.lastContactAt.trim()
      ? new Date(input.lastContactAt)
      : null;

  const handleValue = text("handle");
  const linkValue = text("linkInBio");
  const bioValue = text("bio");

  return {
    name: text("name"),
    handle: handleValue,
    profileUrl: text("profileUrl"),
    category: text("category"),
    contactType: text("contactType"),
    contact: text("contact"),
    tags: text("tags"),
    memo: text("memo"),
    bio: bioValue,
    linkInBio: linkValue,
    profileImageUrl: text("profileImageUrl"),
    igUserId: text("igUserId"),
    platform,
    status,
    followers: followers === null ? null : Math.round(followers),
    following: following === null ? null : Math.round(following),
    feeKrw: feeKrw === null ? null : Math.round(feeKrw),
    commissionRate,
    rating: rating === null ? null : Math.min(5, Math.max(1, Math.round(rating))),
    lastContactAt:
      lastContact && !Number.isNaN(lastContact.getTime()) ? lastContact : null,
    hasLastContactField: typeof input.lastContactAt === "string",
    postCount: postCount === null ? null : Math.round(postCount),
    avgLikes: avgLikes === null ? null : Math.round(avgLikes),
    avgComments: avgComments === null ? null : Math.round(avgComments),
    engagementRate,
    syncedAt: synced && !Number.isNaN(synced.getTime()) ? synced : null,
    hasSyncedAtField: typeof input.syncedAt === "string",
    isBusiness: typeof input.isBusiness === "boolean" ? input.isBusiness : undefined,
  };
}
