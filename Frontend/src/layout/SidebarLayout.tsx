import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";

export interface SidebarLayoutProps {
  children?: ReactNode;
  terapeutaNome?: string;
}

export function SidebarLayout({
  children,
  terapeutaNome = "Dr. Hermeson Alves",
}: SidebarLayoutProps) {
  const hour = new Date().getHours();
  const saudacao =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh max-h-svh overflow-x-hidden flex flex-row">
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-sidebar/80 px-4 sm:px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  {saudacao}, {terapeutaNome}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Painel de Orquestração Clínica
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#0b3294] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                InTEA v1.0 • Clínico
              </span>
            </div>
          </header>
          <main className="relative flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {children ?? <Outlet />}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default SidebarLayout;
