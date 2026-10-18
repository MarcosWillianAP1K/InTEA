"use client";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import logoIcon from "@/assets/image(1)(1).svg";
import { cn } from "@/shared/lib/utils";

export function NavHeader() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <div
            className={cn(
              "group/logo relative flex min-w-0 flex-1 items-center",
              isCollapsed ? "justify-center" : "min-h-16 px-4 py-6"
            )}
          >
            {!isCollapsed && (
              <div>
                <div className="text-[2.5rem] font-extrabold leading-none tracking-[-0.06em] text-[#0b3294]">
                  InTEA
                </div>
                <div className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-600">
                  Clinical Orchestration
                </div>
              </div>
            )}

            {isCollapsed && (
              <img
                src={logoIcon}
                alt="InTEA"
                className={cn(
                  "h-20 w-20 object-contain transition-opacity",
                  "group-hover/logo:opacity-0"
                )}
              />
            )}

            {isCollapsed && (
              <SidebarTrigger
                aria-label="Expandir barra lateral"
                className="absolute inset-0 h-full w-full opacity-0 transition-opacity group-hover/logo:opacity-100"
              />
            )}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}