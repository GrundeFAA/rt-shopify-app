import type { ReactNode } from "react";

type DashboardFormLayoutProps = {
  children: ReactNode;
  className?: string;
};

type DashboardFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type DashboardFormRowProps = {
  label: string;
  children: ReactNode;
  helpText?: string;
};

function classNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardFormLayout({ children, className }: DashboardFormLayoutProps) {
  return <div className={classNames("space-y-12 sm:space-y-14", className)}>{children}</div>;
}

export function DashboardFormSection({
  title,
  description,
  children,
}: DashboardFormSectionProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-[var(--bk-color-text-strong)]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[var(--bk-color-text-muted)]">{description}</p> : null}
      <div className="mt-6 border-y border-[var(--bk-color-border-default)] sm:divide-y sm:divide-[var(--bk-color-border-default)]">
        {children}
      </div>
    </section>
  );
}

export function DashboardFormRow({ label, children, helpText }: DashboardFormRowProps) {
  return (
    <div className="py-5 sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:py-6">
      <p className="text-sm font-medium text-[var(--bk-color-text-primary)] sm:pt-1.5">{label}</p>
      <div className="mt-2 sm:col-span-2 sm:mt-0">
        {children}
        {helpText ? <p className="mt-2 text-sm text-[var(--bk-color-text-muted)]">{helpText}</p> : null}
      </div>
    </div>
  );
}
