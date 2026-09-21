"use client";

import { useState } from "react";
import { type LucideIcon } from "lucide-react";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/shared/components/ui/dropdown-menu";
import {
  SidebarGroup,
  // SidebarGroupLabel,
  SidebarMenu,
  // SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";
import { cn } from "@/shared/lib/utils";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const [activeItem, setActiveItem] = useState(projects[0]?.name);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu className="gap-4">
        {projects.map((item) => {
          const isActive = activeItem === item.name;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                className={cn(
                    "!h-auto !p-4 text-[0.825rem] ",
                  isActive
                    ? "bg-[#0b3294] text-white hover:bg-[#0b3294] hover:text-white"
                    : "hover:bg-[#0b3294] hover:text-white",
                )}
              >
                <a
                  href={item.url}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveItem(item.name);
                  }}
                >
                  <item.icon />
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
