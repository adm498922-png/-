import { requireUser } from "@/lib/auth";
import { APP_TITLE, getAppMode } from "@/lib/app-mode";
import LogoutButton from "./LogoutButton";
import { TopNav } from "./MainNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const mode = getAppMode();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <span className="shrink-0 text-lg font-bold text-slate-900">
            {APP_TITLE[mode]}
          </span>

          <div className="min-w-0 flex-1">
            <TopNav mode={mode} />
          </div>

          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <span className="max-w-40 truncate text-xs text-slate-500">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>

      {/* 좁은 화면에서는 위 막대에 자리가 없어 아래에 따로 둔다 */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <span className="truncate text-xs text-slate-500">{user.email}</span>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
