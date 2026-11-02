import type { ReactNode } from "react";
import { FullMessages } from "@/components/layout/FullMessages";

export default function Layout({ children }: { children: ReactNode }) {
  return <FullMessages>{children}</FullMessages>;
}
