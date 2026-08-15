"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="4" y="12" width="3.5" height="8" rx="1" />
      <rect x="10.25" y="7" width="3.5" height="13" rx="1" />
      <rect x="16.5" y="4" width="3.5" height="16" rx="1" />
    </svg>
  );
}

function ComposeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path d="M4 20l1.2-4.2L15.6 5.4a1.5 1.5 0 0 1 2.1 0l1 1a1.5 1.5 0 0 1 0 2.1L8.2 18.8 4 20z" strokeLinejoin="round" />
    </svg>
  );
}

function PostsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" strokeLinecap="round" />
    </svg>
  );
}

function ConnectionsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4M17.5 17.5l-1.4-1.4M7.9 7.9 6.5 6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "대시보드", Icon: DashboardIcon },
  { href: "/compose", label: "글쓰기", Icon: ComposeIcon },
  { href: "/posts", label: "전체 글", Icon: PostsIcon },
  { href: "/settings", label: "연결 설정", Icon: ConnectionsIcon },
];

/** 연결 설정 그룹에 속한 하위 페이지들도 "연결 설정" 탭이 활성화된 것처럼 보이게 함 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/settings") {
    return (
      pathname === "/settings" || pathname === "/accounts" || pathname === "/links"
    );
  }
  return pathname === href;
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-neutral-800 text-white"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <item.Icon active={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-800 bg-neutral-900 sm:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? "text-blue-400" : "text-neutral-500"
            }`}
          >
            <item.Icon active={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
