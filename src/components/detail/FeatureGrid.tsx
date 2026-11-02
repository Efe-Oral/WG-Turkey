import type { LucideIcon } from "lucide-react";

export function FeatureGrid({
  items,
}: {
  items: { icon: LucideIcon; label: string }[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex flex-col items-center gap-2 text-center text-meta">
          <span className="flex size-12 items-center justify-center rounded-pill bg-black/4">
            <Icon aria-hidden="true" size={22} />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
