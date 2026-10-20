import { useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";
import { AppSidebar } from "./components/app-sidebar";
import { NavUser } from "./components/nav-user";
import { OverlayNotificacoes } from "./components/OverlayNotificacoes";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { ModalPreSessao } from "@/features/sessao/components/ModalPreSessao";

export interface SidebarLayoutProps {
  children?: ReactNode;
  terapeutaNome?: string;
}

export function SidebarLayout({
  children,
  terapeutaNome,
}: SidebarLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const abrirModalPreSessao = useSessionStore((s) => s.abrirModalPreSessao);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);

  const nomeExibicao = user?.nome || terapeutaNome || "Dr. Hermeson Alves";

  return (
    <SidebarProvider>
      <AppSidebar onCreateNewChat={() => abrirModalPreSessao()} />
      <SidebarInset className="min-h-svh max-h-svh overflow-x-hidden flex flex-row">
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="flex flex-row justify-between items-center px-6 py-3.5 w-full bg-background border-b border-border transition-colors shrink-0 relative">
            {/* Lado Esquerdo: SidebarTrigger + Divisor + Saudação */}
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="-ml-1 shrink-0" />
              <div
                className="h-5 w-px bg-border shrink-0"
                aria-hidden="true"
              />
              <h1 className="text-[20px] md:text-[24px] font-bold text-primary leading-tight tracking-tight truncate">
                Olá, {nomeExibicao}
              </h1>
            </div>

            {/* Lado Direito: Notificações + Perfil do Terapeuta */}
            <div className="flex flex-row items-center gap-[16px] md:gap-[24px] shrink-0 relative">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Notificações"
                  onClick={() => setNotificacoesAbertas(!notificacoesAbertas)}
                  className="relative flex items-center justify-center p-2.5 rounded-full hover:bg-surface-alt text-foreground transition-colors cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#BA1A1A]"
                  />
                </button>
                <OverlayNotificacoes
                  aberto={notificacoesAbertas}
                  onFechar={() => setNotificacoesAbertas(false)}
                />
              </div>

              <NavUser
                user={
                  terapeutaNome && !user
                    ? { name: terapeutaNome }
                    : undefined
                }
              />
            </div>
          </header>

          <main className="relative flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {children ?? <Outlet />}
          </main>
        </div>
      </SidebarInset>

      {/* Modal Pré-Sessão global disponível para toda a aplicação */}
      <ModalPreSessao />
    </SidebarProvider>
  );
}

export default SidebarLayout;
