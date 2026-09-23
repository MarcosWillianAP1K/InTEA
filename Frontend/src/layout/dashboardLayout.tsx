import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { BaseLayout } from "@/layout/LayoutExample";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh max-h-svh overflow-x-hidden flex flex-row">
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-sidebar/80 px-4 backdrop-blur">
            <div className="flex shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:hidden">
              <SidebarTrigger className="-ml-1" />
            </div>
            <span className="text-md font-semibold">Bom dia, Dr. Hermeson</span>
          </header>
          <BaseLayout className="relative flex flex-1 min-h-0 flex-col overflow-x-hidden p-3 pt-0">
            {children}
          </BaseLayout>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
