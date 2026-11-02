import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

function Choice({
  label,
  type,
  className,
  ...props
}: ChoiceProps & { type: "checkbox" | "radio" }) {
  return (
    <label
      className={clsx(
        "inline-flex min-h-6 cursor-pointer items-center gap-2 text-body",
        className,
      )}
    >
      <input type={type} {...props} />
      {label}
    </label>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <Choice type="checkbox" {...props} />;
}

export function Radio(props: ChoiceProps) {
  return <Choice type="radio" {...props} />;
}
