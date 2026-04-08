import type { ReactNode } from "react";

export type DashboardCardProps = {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

function classNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardCard({
  header,
  children,
  footer,
  className,
}: DashboardCardProps) {
  return (
    <section
      className={classNames(
        "overflow-hidden rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]",
        className,
      )}
    >
      {header ? (
        <div className="border-b border-[var(--bk-color-border-default)] px-4 py-4 sm:px-6 sm:py-5">
          {header}
        </div>
      ) : null}

      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>

      {footer ? (
        <div className="border-t border-[var(--bk-color-border-default)] px-4 py-4 sm:px-6">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
