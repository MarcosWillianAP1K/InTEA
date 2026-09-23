"use client";

import * as React from "react";
import { Gamepad2, History, LayoutDashboard, Users } from "lucide-react";

import { NavProjects } from "@/features/dashboard/components/nav-projects";
import { NavUser } from "@/features/dashboard/components/nav-user";
import { NavHeader } from "@/features/dashboard/components/nav-header";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/components/ui/sidebar";
import { NewSection } from "./nav-button";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeSessionId: string | null;
  onCreateNewChat: () => Promise<void>;
  onSelectSession: (sessionId: string) => void;
  // onShareSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => Promise<void>;
  onPinSession: (sessionId: string, pin: boolean) => void;
  onDeleteSession: (sessionId: string) => void;
  isCreatingSession: boolean;
};

// This is sample data.
const data = {
  user: {
    name: "Hermeson",
    email: "testando@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  projects: [
    {
      name: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Games",
      url: "/games",
      icon: Gamepad2,
    },
    {
      name: "Meus Pacientes",
      url: "/patients",
      icon: Users,
    },
    {
      name: "Historico",
      url: "/history",
      icon: History,
    },
  ],
};

export function AppSidebar({
  activeSessionId,
  onCreateNewChat,
  onSelectSession,
  // onShareSession,
  onRenameSession,
  onPinSession,
  onDeleteSession,
  isCreatingSession,
  ...props
}: AppSidebarProps) {
  void activeSessionId;
  void onSelectSession;
  void onRenameSession;
  void onPinSession;
  void onDeleteSession;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavHeader />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={data.navMain} /> */}
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NewSection
          onCreateChat={onCreateNewChat}
          isCreating={isCreatingSession}
        />
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
