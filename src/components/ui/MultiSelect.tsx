"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { popoverClasses, rowClasses, triggerClasses } from "./Dropdown";

type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  label: string;
  placeholder: string;
  selectedLabel: string;
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  className?: string;
};

export function MultiSelect({
  label,
  placeholder,
  selectedLabel,
  options,
  value,
  onValueChange,
  className,
}: MultiSelectProps) {
  const summary = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label)
    .join(", ");

  const toggle = (optionValue: string, checked: boolean) => {
    onValueChange(
      checked
        ? [...value, optionValue]
        : value.filter((item) => item !== optionValue),
    );
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={clsx(triggerClasses, className)}
      >
        <span className="sr-only">{label}: </span>
        <span className={clsx("truncate", !summary && "text-black/60")}>
          {summary || placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className="absolute right-3"
        />
        {value.length > 0 ? (
          <span
            title={selectedLabel}
            className="absolute -top-2 -right-1 flex size-5 items-center justify-center rounded-pill bg-graphite text-small font-semibold text-white tabular-nums"
          >
            {value.length}
          </span>
        ) : null}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className={popoverClasses}
        >
          {options.map((option) => (
            <DropdownMenu.CheckboxItem
              key={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked)}
              onSelect={(event) => event.preventDefault()}
              className={rowClasses}
            >
              <DropdownMenu.ItemIndicator className="absolute left-2">
                <Check aria-hidden="true" size={16} />
              </DropdownMenu.ItemIndicator>
              {option.label}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
