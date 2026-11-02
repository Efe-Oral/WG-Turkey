"use client";

import { Switch } from "radix-ui";
import { useId } from "react";

type ToggleProps = {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Toggle({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
}: ToggleProps) {
  const id = useId();

  return (
    <div className="inline-flex items-center gap-3">
      <Switch.Root
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 cursor-pointer rounded-pill border border-black/60 bg-white data-[state=checked]:bg-cyan"
      >
        <Switch.Thumb className="block size-4 translate-x-1 rounded-pill bg-graphite transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-black" />
      </Switch.Root>
      <label htmlFor={id} className="cursor-pointer text-body">
        {label}
      </label>
    </div>
  );
}
