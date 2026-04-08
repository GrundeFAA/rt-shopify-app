import type { ReactNode } from "react";

export type DashboardBadgeVariant =
  | "neutral"
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "indigo"
  | "purple"
  | "pink";

export type DashboardBadgeProps = {
  children: ReactNode;
  variant?: DashboardBadgeVariant;
  className?: string;
};

function classNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const BADGE_VARIANT_CLASS: Record<DashboardBadgeVariant, string> = {
  neutral:
    "bg-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-400/20",
  danger: "bg-red-400/10 text-red-400 ring-1 ring-inset ring-red-400/20",
  warning:
    "bg-yellow-400/10 text-yellow-500 ring-1 ring-inset ring-yellow-400/20",
  success:
    "bg-green-400/10 text-green-400 ring-1 ring-inset ring-green-500/20",
  info: "bg-blue-400/10 text-blue-400 ring-1 ring-inset ring-blue-400/30",
  indigo:
    "bg-indigo-400/10 text-indigo-400 ring-1 ring-inset ring-indigo-400/30",
  purple:
    "bg-purple-400/10 text-purple-400 ring-1 ring-inset ring-purple-400/30",
  pink: "bg-pink-400/10 text-pink-400 ring-1 ring-inset ring-pink-400/20",
};

export function DashboardBadge({
  children,
  variant = "neutral",
  className,
}: DashboardBadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        BADGE_VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
