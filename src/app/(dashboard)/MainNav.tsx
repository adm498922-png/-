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

function CreatorsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" strokeLinecap="round" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18.4 14.9c1.4.9 2.3 2.5 2.6 4.6" strokeLinecap="round" />
    </svg>
  );
}

function ProductsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path d="M4 8.5 12 4.5l8 4v7L12 19.5l-8-4z" strokeLinejoin="round" />
      <path d="M4 8.5 12 12.5l8-4M12 12.5v7" strokeLinejoin="round" />
    </svg>
  );
}

function LedgerIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" strokeLinecap="round" />
      <circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "대시보드", short: "홈", Icon: DashboardIcon, group: "스레드 발행" },
  { href: "/compose", label: "글쓰기", short: "글쓰기", Icon: ComposeIcon, group: "스레드 발행" },
  { href: "/posts", label: "전체 글", short: "글목록", Icon: PostsIcon, group: "스레드 발행" },
  { href: "/creators", label: "크리에이터", short: "크리에이터", Icon: CreatorsIcon, group: "공동구매" },
  { href: "/products", label: "공구 상품", short: "상품", Icon: ProductsIcon, group: "공동구매" },
  { href: "/calendar", label: "일정 · 할일", short: "일정", Icon: CalendarIcon, group: "공동구매" },
  { href: "/ledger", label: "판매일보", short: "판매일보", Icon: LedgerIcon, group: "공동구매" },
  { href: "/settings", label: "연결 설정", short: "설정", Icon: ConnectionsIcon, group: "설정" },
];

/**
 * 사이트 모드에 맞는 메뉴만 고른다.
 * - gonggu 전용: 공동구매 + 설정
 * - threads 전용: 공동구매를 뺀 나머지
 */
function itemsFor(mode: "full" | "threads" | "gonggu") {
  if (mode === "gonggu") {
    return NAV_ITEMS.filter(
      (item) => item.group === "공동구매" || item.href === "/settings"
    );
  }
  if (mode === "threads") {
    return NAV_ITEMS.filter((item) => item.group !== "공동구매");
  }
  return NAV_ITEMS;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // /creators/xxxx 같은 하위 화면에서도 해당 메뉴가 켜져 있어야 한다.
  return pathname === href || pathname.startsWith(href + "/");
}

export function TopNav({ mode }: { mode: "full" | "threads" | "gonggu" }) {
  const pathname = usePathname();
  const items = itemsFor(mode);
  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto">
      {items.map((item, i) => {
        const active = isActive(pathname, item.href);
        // 묶음이 바뀌는 자리에는 옅은 세로선을 넣어 갈래를 표시한다
        const newGroup = i > 0 && items[i - 1].group !== item.group;
        return (
          <div key={item.href} className="flex items-center">
            {newGroup && <span className="mx-1.5 h-4 w-px shrink-0 bg-slate-200" />}
            <Link
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                active
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <item.Icon active={active} />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
