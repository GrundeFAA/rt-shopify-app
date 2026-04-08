import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

export type DashboardModalAction = {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export type DashboardModalProps = {
  open: boolean;
  onClose: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  primaryAction?: DashboardModalAction;
  secondaryAction?: DashboardModalAction;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
};

const SIZE_CLASS: Record<NonNullable<DashboardModalProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

function classNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function getActionClass(variant: DashboardModalAction["variant"] = "secondary") {
  if (variant === "primary") {
    return "bg-[var(--bk-color-accent-primary)] text-white hover:bg-[var(--bk-color-accent-primary-hover)]";
  }

  return "bg-[var(--bk-color-bg-muted)] text-[var(--bk-color-text-primary)] hover:bg-[#e7ebed]";
}

function renderAction(action: DashboardModalAction | undefined) {
  if (!action) {
    return null;
  }

  return (
    <button
      type={action.type ?? "button"}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={classNames(
        "inline-flex justify-center rounded-[4px] px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        getActionClass(action.variant),
      )}
    >
      {action.loading ? "Jobber..." : action.label}
    </button>
  );
}

export function DashboardModal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  primaryAction,
  secondaryAction,
  size = "md",
  showCloseButton = true,
}: DashboardModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-30">
      <DialogBackdrop className="fixed inset-0 bg-black/45 transition-opacity data-[closed]:opacity-0" />

      <div className="fixed inset-0 z-30 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-6">
          <DialogPanel
            className={classNames(
              "relative w-full transform overflow-hidden rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] p-6 text-left shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95 sm:p-8",
              SIZE_CLASS[size],
            )}
          >
            {showCloseButton ? (
              <button
                type="button"
                onClick={() => onClose(false)}
                className="absolute top-4 right-4 rounded-[4px] p-1 text-[var(--bk-color-text-subtle)] hover:bg-[var(--bk-color-bg-muted)] hover:text-[var(--bk-color-text-primary)]"
              >
                <span className="sr-only">Lukk modal</span>
                <XMarkIcon aria-hidden="true" className="size-5" />
              </button>
            ) : null}

            {(icon || title || description) ? (
              <div className="mb-5">
                {icon ? <div className="mb-3">{icon}</div> : null}
                <DialogTitle className="text-[24px] font-semibold text-[var(--bk-color-text-strong)]">
                  {title}
                </DialogTitle>
                {description ? (
                  <p className="mt-2 text-sm text-[var(--bk-color-text-muted)]">{description}</p>
                ) : null}
              </div>
            ) : null}

            {children ? <div className="text-[var(--bk-color-text-primary)]">{children}</div> : null}

            {footer ? (
              <div className="mt-6 border-t border-[var(--bk-color-border-default)] pt-4">{footer}</div>
            ) : primaryAction || secondaryAction ? (
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--bk-color-border-default)] pt-4 sm:flex-row sm:justify-end">
                {renderAction(secondaryAction)}
                {renderAction(primaryAction)}
              </div>
            ) : null}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
