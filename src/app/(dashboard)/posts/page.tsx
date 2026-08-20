import { redirect } from "next/navigation";
import { isGongguOnly } from "@/lib/app-mode";
import { prisma } from "@/lib/prisma";
import PostList from "./PostList";

export default async function PostsPage() {
  // 공동구매 전용 사이트에는 스레드 화면이 없다.
  if (isGongguOnly()) redirect("/creators");

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { targets: { include: { threadsAccount: true } }, coupangLink: true },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">전체 글</h1>
      <p className="mb-6 text-sm text-slate-500">
        지금까지 작성·예약·발행한 글을 모두 확인하고 수정·삭제할 수 있습니다.
      </p>
      <PostList initialPosts={posts} />
    </div>
  );
}
