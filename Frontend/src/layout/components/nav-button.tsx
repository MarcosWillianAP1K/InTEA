"use client";

import { Loader2, Plus } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";

/**
 * Sidebar footer action button that triggers creation of a new clinical session.
 *
 * @param props - Optional click callback and loading state indicator.
 * @returns Rendered sidebar button group.
 */
export function NewSection({
  onCreateChat,
  isCreating,
}: {
  onCreateChat?: () => Promise<void>;
  isCreating?: boolean;
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            className="h-auto! p-4! bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground hover:cursor-pointer"
            onClick={() => {
              if (onCreateChat) {
                void onCreateChat();
              }
            }}
            disabled={isCreating}
          >
            {isCreating ? <Loader2 className="animate-spin" /> : <Plus />}
            <span>{isCreating ? "Criando..." : "Nova Sessão"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
