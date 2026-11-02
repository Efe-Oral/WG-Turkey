"use client";

import clsx from "clsx";
import { Tabs } from "radix-ui";

type DescriptionTabsProps = {
  label: string;
  tabs: { value: string; label: string; text: string }[];
};

export function DescriptionTabs({ label, tabs }: DescriptionTabsProps) {
  const first = tabs[0];
  if (!first) return null;

  return (
    <Tabs.Root defaultValue={first.value}>
      <Tabs.List aria-label={label} className="flex flex-wrap gap-1 border-b border-black/12">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={clsx(
              "cursor-pointer rounded-t-card px-4 py-2 font-medium",
              "data-[state=active]:bg-cyan data-[state=inactive]:hover:bg-black/4",
            )}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content
          key={tab.value}
          value={tab.value}
          className="py-4 break-words whitespace-pre-line"
        >
          {tab.text}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
