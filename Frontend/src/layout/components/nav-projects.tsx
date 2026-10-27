"use client";

import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";
import { cn } from "@/shared/lib/utils";
import { Link, useLocation } from "react-router-dom";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
    isLive?: boolean;
  }[];
}) {
  const { pathname } = useLocation();

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {projects.map((item) => {
          const isActive =
            pathname === item.url ||
            (item.url === "/painel" && (pathname === "/" || pathname === "/painel")) ||
            (item.url.includes("/monitoramento") && pathname.includes("/monitoramento")) ||
            (item.url === "/jogos" && (pathname === "/jogos" || pathname === "/games")) ||
            (item.url === "/pacientes" && (pathname === "/pacientes" || pathname === "/patients")) ||
            (item.url === "/configuracoes" && (pathname === "/configuracoes" || pathname === "/settings"));

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                className={cn(
                  "h-auto! p-3! text-[0.825rem] rounded-xl font-medium transition-colors",
                  item.isLive && !isActive
                    ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-950/40"
                    : isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
                      : "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary",
                )}
              >
                <Link to={item.url} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        item.isLive && "text-emerald-600 dark:text-emerald-400 animate-pulse",
                      )}
                    />
                    <span className="group-data-[collapsible=icon]:hidden font-medium">
                      {item.name}
                    </span>
                  </div>
                  {item.isLive && (
                    <span className="group-data-[collapsible=icon]:hidden flex h-2 w-2 relative ml-auto">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
