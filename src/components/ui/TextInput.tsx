import clsx from "clsx";
import { Check } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  valid?: boolean;
};

export function TextInput({
  label,
  error,
  valid = false,
  id,
  className,
  ...props
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const showValid = valid && !error;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="text-meta font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx(
            "h-11 w-full rounded-input border bg-white px-3 text-body",
            "placeholder:text-black/60",
            error ? "border-error" : "border-black/20",
            showValid && "pr-10",
          )}
          {...props}
        />
        {showValid ? (
          <Check
            aria-hidden="true"
            size={18}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-valid"
          />
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-meta text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
