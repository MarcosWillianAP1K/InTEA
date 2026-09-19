import type React from "react";
import { cn } from "@/shared/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function BaseLayout({ children, className }: LayoutProps) {
  return (
    <main className={cn("flex flex-1 flex-col gap-4 p-4 pt-0", className)}>
      {children}
    </main>
  );
}