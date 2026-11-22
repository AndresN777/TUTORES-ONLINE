"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavIcon = "home" | "search" | "book" | "user" | "calendar" | "users" | "tags" | "star";
export type NavItem = { href: string; label: string; icon: NavIcon };

const ICONS: Record<NavIcon, React.ReactNode> = {
  home: <path d="M3 14L15 3l12 11M6 11v16h18V11M12 27v-8h6v8" />,
  search: <><circle cx="12" cy="12" r="9" /><path d="M19 19l9 9" /></>,
  book: <path d="M15 6C10 3 5 3 1 4v22c4-1 9-1 14 2 5-3 10-3 14-2V4c-4-1-9-1-14 2zM15 6v22" />,
  user: <><circle cx="15" cy="10" r="6" /><path d="M4 28c1-7 5-10 11-10s10 3 11 10" /></>,
  calendar: <><rect x="3" y="6" width="24" height="21" rx="2" /><path d="M3 12h24M9 3v6M21 3v6M9 17h3M15 17h3M9 22h3M15 22h3" /></>,
  users: <><circle cx="11" cy="10" r="5" /><path d="M1 27c1-6 5-9 10-9s9 3 10 9" /><circle cx="22" cy="9" r="4" /><path d="M23 17c4 0 6 3 7 8" /></>,
  tags: <><path d="M3 3h11l13 13-11 11L3 14z" /><circle cx="9" cy="9" r="2" /></>,
  star: <path d="M15 3l3.6 7.6 8.4 1-6.2 5.8 1.6 8.3L15 21.6 7.6 25.7l1.6-8.3L3 11.6l8.4-1z" />,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // The area root (e.g. /student) is active only on itself; deeper items match by prefix.
  const isActive = (href: string, i: number) => (i === 0 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item, i) => {
        const active = isActive(item.href, i);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 items-center gap-4 border-l-[5px] px-4 text-lg text-ink ${active ? "border-accent bg-accent-tint" : "border-transparent hover:bg-field"}`}
            >
              <svg width="28" height="28" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" className="text-ink-soft">
                {ICONS[item.icon]}
              </svg>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
