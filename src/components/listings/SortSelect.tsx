"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";

type SortSelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string; href: string }[];
};

export function SortSelect({ label, value, options }: SortSelectProps) {
  const router = useRouter();

  return (
    <Dropdown
      label={label}
      placeholder={label}
      value={value}
      options={options}
      className="sm:w-56"
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) router.push(option.href, { scroll: false });
      }}
    />
  );
}
