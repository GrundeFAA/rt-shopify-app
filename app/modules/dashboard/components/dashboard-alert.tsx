import type { ReactNode } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";

export type DashboardAlertVariant = "info" | "success" | "warning" | "error";

export type DashboardAlertProps = {
  title: string;
  children: ReactNode;
  variant?: DashboardAlertVariant;
};

type AlertTheme = {
  container: string;
  icon: string;
  title: string;
  body: string;
  Icon: typeof InformationCircleIcon;
};

const ALERT_THEMES: Record<DashboardAlertVariant, AlertTheme> = {
  info: {
    container:
      "rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-subtle)] p-4",
    icon: "text-[var(--bk-color-accent-secondary)]",
    title: "text-sm font-medium text-[var(--bk-color-text-strong)]",
    body: "mt-2 text-sm text-[var(--bk-color-text-muted)]",
    Icon: InformationCircleIcon,
  },
  success: {
    container: "rounded-[6px] border border-[#b5d9c7] bg-[#eef8f1] p-4",
    icon: "text-[#0f5132]",
    title: "text-sm font-medium text-[#0f5132]",
    body: "mt-2 text-sm text-[#1b6943]",
    Icon: CheckCircleIcon,
  },
  warning: {
    container: "rounded-[6px] bg-yellow-500/10 p-4 outline outline-yellow-500/15",
    icon: "text-yellow-300",
    title: "text-sm font-medium text-yellow-100",
    body: "mt-2 text-sm text-yellow-100/80",
    Icon: ExclamationTriangleIcon,
  },
  error: {
    container: "rounded-[6px] border border-[#e0b3b3] bg-[#fff5f5] p-4",
    icon: "text-[#8a1f1f]",
    title: "text-sm font-medium text-[#8a1f1f]",
    body: "mt-2 text-sm text-[var(--bk-color-text-muted)]",
    Icon: XCircleIcon,
  },
};

export function DashboardAlert({
  title,
  children,
  variant = "info",
}: DashboardAlertProps) {
  const theme = ALERT_THEMES[variant];

  return (
    <div className={theme.container} role="status">
      <div className="flex">
        <div className="shrink-0">
          <theme.Icon aria-hidden="true" className={`size-5 ${theme.icon}`} />
        </div>
        <div className="ml-3">
          <h3 className={theme.title}>{title}</h3>
          <div className={theme.body}>{children}</div>
        </div>
      </div>
    </div>
  );
}
