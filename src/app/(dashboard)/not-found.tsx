import Link from "next/link";

// notFound() 로 들어오는 화면 — 이를테면 이미 삭제된 크리에이터 링크를
// 눌렀을 때. 기본 제공 화면 대신 이 사이트 색(흰 바탕 + 파랑)에 맞춘다.
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-blue-600">404</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">
        찾으시는 페이지가 없습니다
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        삭제됐거나 주소가 바뀐 페이지입니다. 즐겨찾기나 예전 링크로 들어오신
        경우 자주 생깁니다.
      </p>
      <Link
        href="/creators"
        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
      >
        크리에이터 목록으로
      </Link>
    </div>
  );
}
