"use client";

import * as React from "react";
import {
  Gamepad2,
  LayoutDashboard,
  Users,
  UserCheck,
  History,
  Settings,
  ShieldCheck,
  Activity,
} from "lucide-react";

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
import { useSessionStore } from "@/features/sessao/store/sessionStore";

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

  const statusSessao = useSessionStore((s) => s.status);
  const pareamentoSessao = useSessionStore((s) => s.pareamento);

  // REGRA CLÍNICA: Cockpit aparece no menu lateral SOMENTE quando a sessão estiver em andamento
  const [sessaoPersistidaId, setSessaoPersistidaId] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const salvo =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("intea_active_session")
          : null;
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed.status === "em_andamento" || parsed.status === "pareado") {
          setSessaoPersistidaId(
            parsed.pareamento?.sessionToken || "44444444-4444-4444-8444-444444444444"
          );
        } else {
          setSessaoPersistidaId(null);
        }
      } else {
        setSessaoPersistidaId(null);
      }
    } catch {
      setSessaoPersistidaId(null);
    }
  }, [statusSessao]);

  const hasSessaoAtiva =
    statusSessao === "em_andamento" ||
    statusSessao === "pareado" ||
    Boolean(sessaoPersistidaId);
  const sessaoIdDestino =
    pareamentoSessao?.sessionToken ||
    sessaoPersistidaId ||
    activeSessionId ||
    "44444444-4444-4444-8444-444444444444";

  const navItems = [
    {
      name: "Dashboard",
      url: "/painel",
      icon: LayoutDashboard,
    },
    ...(hasSessaoAtiva
      ? [
          {
            name: "Cockpit (Em Andamento)",
            url: `/sessao/${encodeURIComponent(sessaoIdDestino)}/monitoramento`,
            icon: Activity,
            isLive: true,
          },
        ]
      : []),
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
          {
            name: "Auditoria Clínica",
            url: "/admin/auditoria",
            icon: ShieldCheck,
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
