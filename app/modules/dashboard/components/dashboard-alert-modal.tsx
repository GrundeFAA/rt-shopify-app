import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { DashboardModal } from "./dashboard-modal";

export type DashboardAlertModalVariant = "danger" | "warning" | "info" | "success";

export type DashboardAlertModalProps = {
  open: boolean;
  onClose: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: DashboardAlertModalVariant;
  showCloseButton?: boolean;
  children?: ReactNode;
};

function classNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

type VariantTheme = {
  iconContainer: string;
  iconColor: string;
  confirmButton: string;
};

const VARIANT_THEME: Record<DashboardAlertModalVariant, VariantTheme> = {
  danger: {
    iconContainer: "bg-red-500/10",
    iconColor: "text-red-500",
    confirmButton: "bg-red-600 text-white hover:bg-red-500",
  },
  warning: {
    iconContainer: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    confirmButton: "bg-yellow-600 text-white hover:bg-yellow-500",
  },
  info: {
    iconContainer: "bg-[var(--bk-color-accent-secondary)]/10",
    iconColor: "text-[var(--bk-color-accent-secondary)]",
    confirmButton: "bg-[var(--bk-color-accent-secondary)] text-white hover:bg-[#243f6d]",
  },
  success: {
    iconContainer: "bg-green-500/10",
    iconColor: "text-green-600",
    confirmButton: "bg-green-600 text-white hover:bg-green-500",
  },
};

function AlertIcon({ variant }: { variant: DashboardAlertModalVariant }) {
  const theme = VARIANT_THEME[variant];
  const iconClass = classNames("size-6", theme.iconColor);

  if (variant === "success") {
    return <CheckCircleIcon aria-hidden="true" className={iconClass} />;
  }

  if (variant === "info") {
    return <InformationCircleIcon aria-hidden="true" className={iconClass} />;
  }

  return <ExclamationTriangleIcon aria-hidden="true" className={iconClass} />;
}

export function DashboardAlertModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Bekreft",
  cancelLabel = "Avbryt",
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  size = "md",
  variant = "warning",
  showCloseButton = true,
  children,
}: DashboardAlertModalProps) {
  const theme = VARIANT_THEME[variant];

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      size={size}
      showCloseButton={showCloseButton}
      icon={
        <div
          className={classNames(
            "flex size-12 items-center justify-center rounded-full",
            theme.iconContainer,
          )}
        >
          <AlertIcon variant={variant} />
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              onCancel?.();
              onClose(false);
            }}
            className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-bg-muted)] px-4 py-2 text-sm font-semibold text-[var(--bk-color-text-primary)] transition-colors duration-200 hover:bg-[#e7ebed]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || loading}
            className={classNames(
              "inline-flex justify-center rounded-[4px] px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
              theme.confirmButton,
            )}
          >
            {loading ? "Jobber..." : confirmLabel}
          </button>
        </div>
      }
    >
      {children}
    </DashboardModal>
  );
}
