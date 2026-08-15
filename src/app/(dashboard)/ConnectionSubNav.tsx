"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/accounts", label: "스레드 계정" },
  { href: "/links", label: "쿠팡 링크" },
  { href: "/settings", label: "API/자동화 설정" },
];

export default function ConnectionSubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-neutral-800">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm ${
              active
                ? "border-blue-500 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
