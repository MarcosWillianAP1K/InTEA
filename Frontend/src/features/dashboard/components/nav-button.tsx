"use client";

import { Loader2, PenBox, Plus } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";

export function NewSection({
  onCreateChat,
  isCreating,
}: {
  onCreateChat: () => Promise<void>;
  isCreating: boolean;
}) {
  return (
    <SidebarGroup>
     
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            className="!h-auto !p-4 bg-[#0b3294] text-white hover:bg-[#0b3294] hover:text-white hover:cursor-pointer"
            onClick={() => {
              void onCreateChat();
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