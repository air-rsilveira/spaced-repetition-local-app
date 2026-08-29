"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Static list of primary navigation destinations. Exported so tests can reuse
 * the same source of truth when asserting active-state behavior.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Dashboard" },
];

/**
 * Primary navigation for the app shell. Renders one `<Link>` per destination
 * and marks the destination whose href matches the current pathname as active.
 *
 * The active affordance is conveyed by more than color alone (a bottom border
 * plus bold weight) alongside `aria-current="page"`, per the accessibility
 * requirement. When the pathname matches no destination, no item is active.
 */
export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-aws-orange font-bold text-aws-white"
                : "border-transparent font-normal text-aws-gray-200 hover:text-aws-white",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
