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
            (item.url === "/jogos" && (pathname === "/jogos" || pathname === "/games")) ||
            (item.url === "/pacientes" && (pathname === "/pacientes" || pathname === "/patients")) ||
            (item.url === "/configuracoes" && (pathname === "/configuracoes" || pathname === "/settings"));

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                className={cn(
                  "!h-auto !p-3 text-[0.825rem] rounded-xl font-medium transition-colors",
                  isActive
                    ? "bg-[#0b3294] text-white hover:bg-[#0b3294] hover:text-white"
                    : "hover:bg-[#0b3294]/10 hover:text-[#0b3294] dark:hover:bg-blue-950/40 dark:hover:text-blue-300",
                )}
              >
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.name}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
