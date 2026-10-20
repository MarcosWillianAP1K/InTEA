import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { SettingsPage } from "@/features/configuracoes";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { MOCK_CREDENCIAIS_VALIDAS } from "@/features/autenticacao/types/bdmock";

export interface NavUserProps {
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
    roleLabel?: string;
    registroProfissional?: string;
  };
}

interface NavUserContentProps extends NavUserProps {
  onNavigateLogin: () => void;
}

/**
 * Extrai as iniciais do terapeuta removendo títulos honoríficos ("Dr.", "Dra.", "Dr(a).").
 * Exemplos:
 * - "Dr. Hermeson Alves" -> "HA"
 * - "Dr. Marcos Terapeuta" -> "MT"
 * - "Dra. Luma Maiara" -> "LM"
 * - "Admin InTEA" -> "AI"
 */
export function extrairIniciaisTerapeuta(nomeCompleto: string): string {
  const limpo = nomeCompleto
    .replace(/^(dr\(a\)\.|dra\.|dr\.)\s*/i, "")
    .trim();

  if (!limpo) return "IN";

  const partes = limpo.split(/\s+/).filter(Boolean);
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes[partes.length - 1]?.[0] ?? "";
  return `${primeira}${ultima}`.toUpperCase();
}

function NavUserContent({ user, onNavigateLogin }: NavUserContentProps) {
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fixtureMatch = MOCK_CREDENCIAIS_VALIDAS.find(
    (cred) =>
      (authUser?.id && cred.usuario.id === authUser.id) ||
      (authUser?.email &&
        cred.usuario.email.toLowerCase() === authUser.email.toLowerCase()),
  )?.usuario;

  const displayName =
    user?.name || authUser?.nome || "Dr. Hermeson Alves";
  const displayEmail =
    user?.email || authUser?.email || "hermeson.alves@intea.clinica";
  const displayAvatar = user?.avatar || authUser?.avatar || "";

  const displayRole =
    user?.roleLabel ||
    (authUser?.role === "super_admin" || authUser?.is_super_admin
      ? "Super Administrador"
      : authUser?.especialidade ||
        fixtureMatch?.especialidade ||
        "Terapeuta Ocupacional");

  const displayRegistro =
    user?.registroProfissional ||
    authUser?.registro_profissional ||
    authUser?.crefito ||
    fixtureMatch?.registro_profissional ||
    fixtureMatch?.crefito ||
    "CREFITO-14/87654-TO";

  const iniciais = extrairIniciaisTerapeuta(displayName);

  const handleLogout = async () => {
    await logout();
    onNavigateLogin();
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Menu de perfil de ${displayName}`}
            className="flex flex-row items-center gap-[12px] p-[4px] pr-3 rounded-full hover:bg-surface-alt transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-9 w-9 rounded-full border border-primary-light">
              {displayAvatar ? (
                <AvatarImage src={displayAvatar} alt={displayName} />
              ) : null}
              <AvatarFallback className="rounded-full bg-primary/10 text-primary font-semibold text-xs">
                {iniciais}
              </AvatarFallback>
            </Avatar>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[14px] font-semibold text-foreground-heading leading-tight">
                {displayName}
              </span>
              <span className="text-[12px] font-medium text-foreground leading-tight max-w-[180px] truncate">
                {displayRole}
              </span>
              <span className="sr-only">{displayEmail}</span>
            </div>

            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="w-60 rounded-[12px]"
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-3 px-2.5 py-2 text-left text-sm">
              <Avatar className="h-9 w-9 rounded-full border border-primary-light shrink-0">
                {displayAvatar ? (
                  <AvatarImage src={displayAvatar} alt={displayName} />
                ) : null}
                <AvatarFallback className="rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate font-semibold text-foreground-heading text-sm">
                  {displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </span>
                {displayRegistro && (
                  <span className="truncate text-[11px] font-mono text-primary mt-0.5">
                    {displayRegistro}
                  </span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => setSettingsOpen(true)}
              className="cursor-pointer rounded-lg"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer rounded-lg">
              <CircleHelp className="mr-2 h-4 w-4" />
              <span>Suporte &amp; Ajuda</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              void handleLogout();
            }}
            className="cursor-pointer rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span>Sair da Conta</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* OVERLAY DE CONFIGURAÇÕES (DIALOG) */}
      <DialogContent className="sm:max-w-[720px] md:max-w-[820px] w-[92vw] h-[75vh] p-0 overflow-hidden rounded-[16px]">
        <DialogTitle className="sr-only">Configurações do Sistema</DialogTitle>
        <DialogDescription className="sr-only">
          Gerencie preferências visuais e configurações da sua conta clínica no InTEA.
        </DialogDescription>
        <div className="h-full min-h-0 overflow-hidden">
          <SettingsPage />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavUserWithRouter(props: NavUserProps) {
  const navigate = useNavigate();
  return (
    <NavUserContent
      {...props}
      onNavigateLogin={() => navigate("/login", { replace: true })}
    />
  );
}

export function NavUser(props: NavUserProps = {}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <NavUserWithRouter {...props} />;
  }
  return (
    <NavUserContent
      {...props}
      onNavigateLogin={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }}
    />
  );
}

export default NavUser;
