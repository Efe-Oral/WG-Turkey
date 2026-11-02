import type { ReactNode } from "react";

type EmptyStateProps = {
  text: string;
  action: ReactNode;
};

export function EmptyState({ text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p>{text}</p>
      {action}
    </div>
  );
}
