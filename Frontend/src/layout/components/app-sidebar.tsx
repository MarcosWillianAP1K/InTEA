"use client";

import * as React from "react";
import { Gamepad2, LayoutDashboard, Users } from "lucide-react";

import { NavProjects } from "./nav-projects";
import { NavHeader } from "./nav-header";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/components/ui/sidebar";
import { NewSection } from "./nav-button";

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeSessionId?: string | null;
  onCreateNewChat?: () => Promise<void>;
  onSelectSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, title: string) => Promise<void>;
  onPinSession?: (sessionId: string, pin: boolean) => void;
  onDeleteSession?: (sessionId: string) => void;
  isCreatingSession?: boolean;
}

const SIDEBAR_NAV_ITEMS = [
  {
    name: "Dashboard",
    url: "/painel",
    icon: LayoutDashboard,
  },
  {
    name: "Jogos Terapêuticos",
    url: "/jogos",
    icon: Gamepad2,
  },
  {
    name: "Meus Pacientes",
    url: "/pacientes",
    icon: Users,
  },
];

export function AppSidebar({
  activeSessionId,
  onCreateNewChat,
  onSelectSession,
  onRenameSession,
  onPinSession,
  onDeleteSession,
  isCreatingSession = false,
  ...props
}: AppSidebarProps) {
  void activeSessionId;
  void onSelectSession;
  void onRenameSession;
  void onPinSession;
  void onDeleteSession;

  return (
    <Sidebar collapsible="icon" className="bg-sidebar border-r border-sidebar-border" {...props}>
      <SidebarHeader>
        <NavHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={SIDEBAR_NAV_ITEMS} />
      </SidebarContent>
      <SidebarFooter>
        <NewSection
          onCreateChat={onCreateNewChat}
          isCreating={isCreatingSession}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
