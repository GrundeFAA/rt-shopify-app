import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";

export type DashboardRowActionItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type DashboardRowActionsMenuProps = {
  srLabel?: string;
  items: DashboardRowActionItem[];
};

export function DashboardRowActionsMenu({
  srLabel = "Åpne handlinger",
  items,
}: DashboardRowActionsMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton className="flex size-8 items-center justify-center rounded-[4px] text-[var(--bk-color-text-subtle)] transition-colors duration-200 hover:bg-[var(--bk-color-bg-muted)] hover:text-[var(--bk-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bk-color-accent-secondary)]">
        <span className="sr-only">{srLabel}</span>
        <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        transition
        className="z-20 mt-2 w-48 origin-top-right rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in"
      >
        <div className="py-1">
          {items.map((item, index) => (
            <MenuItem key={`${item.label}-${index}`} disabled={item.disabled}>
              <button
                type="button"
                onClick={item.onClick}
                disabled={item.disabled}
                className="block w-full px-3 py-2 text-left text-sm text-[var(--bk-color-text-primary)] transition-colors duration-150 data-[focus]:bg-[var(--bk-color-bg-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.label}
              </button>
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  );
}
