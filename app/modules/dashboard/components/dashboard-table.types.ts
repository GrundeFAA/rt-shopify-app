import type { ReactNode } from "react";

export type DashboardTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  renderCell: (row: T) => ReactNode;
};

export type DashboardTableAction<T> = {
  label: string;
  href?: string;
  onClick?: (row: T) => void;
  srLabel?: (row: T) => string;
};

export type DashboardTableProps<T> = {
  title: string;
  description?: string;
  embedded?: boolean;
  rows: T[];
  columns: DashboardTableColumn<T>[];
  getRowKey: (row: T, index: number) => string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  rowAction?: DashboardTableAction<T>;
  emptyStateText?: string;
};
