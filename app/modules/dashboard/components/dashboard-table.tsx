import type { DashboardTableProps } from "./dashboard-table.types";

function classNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardTable<T>({
  title,
  description,
  embedded = false,
  rows,
  columns,
  getRowKey,
  primaryActionLabel,
  onPrimaryAction,
  rowAction,
  emptyStateText = "Ingen oppføringer tilgjengelig.",
}: DashboardTableProps<T>) {
  return (
    <section
      className={classNames(
        embedded
          ? ""
          : "rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.10)] sm:p-8",
      )}
    >
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h2 className="text-[24px] font-semibold text-[var(--bk-color-text-strong)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm text-[var(--bk-color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {primaryActionLabel ? (
          <div className="mt-4 sm:mt-0 sm:ml-6 sm:flex-none">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex h-11 items-center justify-center rounded-[4px] bg-[var(--bk-color-accent-primary)] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--bk-color-accent-primary-hover)]"
            >
              {primaryActionLabel}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[6px] border border-[var(--bk-color-border-default)]">
              <table className="min-w-full divide-y divide-[var(--bk-color-border-default)]">
                <thead className="bg-[var(--bk-color-bg-subtle)]">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={classNames(
                          "px-4 py-3 text-left text-sm font-semibold text-[var(--bk-color-text-primary)]",
                          column.className,
                        )}
                      >
                        {column.header}
                      </th>
                    ))}
                    {rowAction ? (
                      <th scope="col" className="py-3 pr-4 pl-3 text-right sm:pr-6">
                        <span className="sr-only">{rowAction.label}</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)]">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + (rowAction ? 1 : 0)}
                        className="px-4 py-8 text-center text-sm text-[var(--bk-color-text-subtle)]"
                      >
                        {emptyStateText}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={getRowKey(row, index)}>
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={classNames(
                              "px-4 py-4 text-sm text-[var(--bk-color-text-muted)]",
                              column.className,
                            )}
                          >
                            {column.renderCell(row)}
                          </td>
                        ))}
                        {rowAction ? (
                          <td className="py-4 pr-4 pl-3 text-right text-sm font-medium sm:pr-6">
                            {rowAction.href ? (
                              <a
                                href={rowAction.href}
                                onClick={(event) => {
                                  if (rowAction.onClick) {
                                    event.preventDefault();
                                    rowAction.onClick(row);
                                  }
                                }}
                                className="text-[var(--bk-color-accent-secondary)] hover:text-[var(--bk-color-text-primary)]"
                              >
                                {rowAction.label}
                                {rowAction.srLabel ? (
                                  <span className="sr-only">
                                    , {rowAction.srLabel(row)}
                                  </span>
                                ) : null}
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => rowAction.onClick?.(row)}
                                className="text-[var(--bk-color-accent-secondary)] hover:text-[var(--bk-color-text-primary)]"
                              >
                                {rowAction.label}
                              </button>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
