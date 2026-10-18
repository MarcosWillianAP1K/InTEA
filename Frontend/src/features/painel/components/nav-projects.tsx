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
      <SidebarMenu className="gap-4">
        {projects.map((item) => {
          const isActive = pathname === item.url;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                className={cn(
                  "!h-auto !p-4 text-[0.825rem]",
                  isActive
                    ? "bg-[#0b3294] text-white hover:bg-[#0b3294] hover:text-white"
                    : "hover:bg-[#0b3294] hover:text-white",
                )}
              >
                <Link to={item.url}>
                  <item.icon />
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
