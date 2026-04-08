import { ChevronDownIcon } from "@heroicons/react/16/solid";
import type { ComponentType, SVGProps } from "react";

type TabIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type DashboardTabItem<TKey extends string = string> = {
  key: TKey;
  name: string;
  href: string;
  icon: TabIcon;
  current?: boolean;
};

type DashboardTabsProps<TKey extends string = string> = {
  tabs: DashboardTabItem<TKey>[];
  onSelect?: (tab: DashboardTabItem<TKey>) => void;
};

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardTabs<TKey extends string = string>({
  tabs,
  onSelect,
}: DashboardTabsProps<TKey>) {
  const currentTab = tabs.find((tab) => tab.current) ?? tabs[0];

  const handleSelect = (tabKey: string) => {
    const selected = tabs.find((tab) => tab.key === tabKey);
    if (selected && onSelect) {
      onSelect(selected);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:hidden">
        <select
          value={currentTab?.key}
          aria-label="Velg en fane"
          className="col-start-1 row-start-1 w-full appearance-none rounded-[4px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] py-2 pr-8 pl-3 text-base text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
          onChange={(event) => handleSelect(event.target.value)}
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-[var(--bk-color-text-subtle)]"
        />
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-[var(--bk-color-border-default)]">
          <nav aria-label="Faner" className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.key}
                href={tab.href}
                aria-current={tab.current ? "page" : undefined}
                onClick={(event) => {
                  if (tab.href === "#") {
                    event.preventDefault();
                  }
                  handleSelect(tab.key);
                }}
                className={classNames(
                  tab.current
                    ? "border-[var(--bk-color-accent-secondary)] text-[var(--bk-color-accent-secondary)]"
                    : "border-transparent text-[var(--bk-color-text-subtle)] hover:border-[var(--bk-color-border-default)] hover:text-[var(--bk-color-text-primary)]",
                  "group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium",
                )}
              >
                <tab.icon
                  aria-hidden="true"
                  className={classNames(
                    tab.current
                      ? "text-[var(--bk-color-accent-secondary)]"
                      : "text-[var(--bk-color-text-subtle)] group-hover:text-[var(--bk-color-text-muted)]",
                    "mr-2 -ml-0.5 size-5",
                  )}
                />
                <span>{tab.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
