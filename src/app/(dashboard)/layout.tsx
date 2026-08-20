import { requireUser } from "@/lib/auth";
import { APP_TITLE, getAppMode } from "@/lib/app-mode";
import LogoutButton from "./LogoutButton";
import { SidebarNav, BottomNav } from "./MainNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const mode = getAppMode();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 p-4 sm:flex">
        <div className="mb-6 px-2 text-lg font-bold text-white">
          {APP_TITLE[mode]}
        </div>
        <SidebarNav mode={mode} />
        <div className="mt-auto space-y-2 border-t border-neutral-800 pt-4">
          <p className="truncate px-2 text-xs text-neutral-500">
            {user.email}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 pb-24 sm:pb-6">
        {children}
      </main>
      <BottomNav mode={mode} />
    </div>
  );
}
