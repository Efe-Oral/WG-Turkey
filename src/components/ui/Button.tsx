import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  compact?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-cyan font-bold text-black hover:brightness-[.94]",
  secondary: "bg-white font-medium text-black shadow-card hover:bg-black/4",
  dark: "bg-graphite font-bold text-white hover:brightness-[.94]",
  ghost: "bg-transparent font-medium text-black hover:bg-black/4",
};

export function Button({
  variant = "primary",
  compact = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-pill px-6 text-body",
        "cursor-pointer disabled:cursor-not-allowed disabled:bg-black/4 disabled:text-black/30",
        "disabled:shadow-none disabled:brightness-100",
        compact ? "h-10" : "h-11",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
