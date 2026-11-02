import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({ selected = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "inline-flex min-h-7 cursor-pointer items-center rounded-pill px-3 text-meta",
        selected ? "bg-cyan text-black" : "bg-black/4 text-black",
        className,
      )}
      {...props}
    />
  );
}
