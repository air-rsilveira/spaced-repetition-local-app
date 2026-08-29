import Link from "next/link";

export interface BackLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

/**
 * Shared navigation component for back/breadcrumb links.
 *
 * A keyboard-focusable link wrapping `next/link`. Supports two variants:
 * - `secondary` (default): uses `aws-blue` for less prominent navigation
 * - `primary`: uses `aws-orange` for emphasized calls-to-action
 *
 * Uses AWS palette tokens only; hover state provides visual feedback.
 * The link is naturally keyboard-focusable via the underlying anchor element.
 */
export default function BackLink({
  href,
  children,
  variant = "secondary",
}: BackLinkProps) {
  const isPrimary = variant === "primary";

  return (
    <Link
      href={href}
      className={[
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        isPrimary
          ? "border-aws-orange text-aws-orange hover:bg-aws-orange hover:text-aws-squid-ink"
          : "border-aws-blue text-aws-blue hover:bg-aws-blue hover:text-aws-white",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
