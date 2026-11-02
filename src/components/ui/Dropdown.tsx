"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export const triggerClasses = clsx(
  "relative inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-pill",
  "border border-black/20 bg-white pr-8 pl-4 text-body",
);

export const popoverClasses =
  "z-50 min-w-(--radix-popper-anchor-width) rounded-card bg-white p-1 shadow-float";

export const rowClasses = clsx(
  "flex cursor-pointer items-center gap-2 rounded-input py-2 pr-3 pl-8 text-body outline-none",
  "relative data-highlighted:bg-black/4 data-[state=checked]:bg-black/4",
);

export function Dropdown({
  label,
  placeholder,
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: DropdownProps) {
  return (
    <Select.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      <Select.Trigger
        aria-label={label}
        className={clsx(triggerClasses, "group", className)}
      >
        <span className="truncate group-data-placeholder:text-black/60">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon className="absolute right-3">
          <ChevronDown aria-hidden="true" size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className={popoverClasses}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className={rowClasses}
              >
                <Select.ItemIndicator className="absolute left-2">
                  <Check aria-hidden="true" size={16} />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
