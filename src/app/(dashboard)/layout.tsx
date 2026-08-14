import Link from "next/link";
import { requireUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/accounts", label: "스레드 계정" },
  { href: "/links", label: "쿠팡 링크" },
  { href: "/compose", label: "글 작성/예약" },
  { href: "/settings", label: "설정" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-6 px-2 text-lg font-bold text-white">
          Threads Hub
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-neutral-800 pt-4">
          <p className="truncate px-2 text-xs text-neutral-500">
            {user.email}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
