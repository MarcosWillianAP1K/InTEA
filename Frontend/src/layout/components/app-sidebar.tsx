"use client";

import * as React from "react";
import { Gamepad2, LayoutDashboard, Users, UserCheck, History, Settings } from "lucide-react";

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
import { useAuthStore } from "@/features/autenticacao/store/authStore";

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeSessionId?: string | null;
  onCreateNewChat?: () => void | Promise<void>;
  onSelectSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, title: string) => Promise<void>;
  onPinSession?: (sessionId: string, pin: boolean) => void;
  onDeleteSession?: (sessionId: string) => void;
  isCreatingSession?: boolean;
}

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

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = Boolean(
    user?.is_super_admin ||
    (user as { role?: string })?.role === "super_admin"
  );

  const navItems = [
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
    ...(isSuperAdmin
      ? [
          {
            name: "Todos os Pacientes",
            url: "/pacientes/todos",
            icon: UserCheck,
          },
        ]
      : []),
    {
      name: "Histórico",
      url: "/historico",
      icon: History,
    },
    {
      name: "Configurações",
      url: "/configuracoes",
      icon: Settings,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="bg-sidebar border-r border-sidebar-border" {...props}>
      <SidebarHeader>
        <NavHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NewSection
          onCreateChat={
            onCreateNewChat
              ? async () => {
                  await onCreateNewChat();
                }
              : undefined
          }
          isCreating={isCreatingSession}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
