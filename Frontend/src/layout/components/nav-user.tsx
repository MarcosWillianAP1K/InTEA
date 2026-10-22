import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Settings,
} from "lucide-react";
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
  onNavigateSettings?: () => void;
}

function extrairIniciaisTerapeuta(nomeCompleto: string): string {
  const partes = nomeCompleto
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "T";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function NavUserContent({ user, onNavigateLogin, onNavigateSettings }: NavUserContentProps) {
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const fixtureMatch = MOCK_CREDENCIAIS_VALIDAS.find(
    (item) => item.usuario.id === authUser?.id || item.usuario.email === authUser?.email
  )?.usuario;

  const displayName =
    user?.name ||
    authUser?.nome ||
    fixtureMatch?.nome ||
    "Dr. Hermeson Alves";

  const displayEmail =
    user?.email ||
    authUser?.email ||
    fixtureMatch?.email ||
    "hermeson.alves@intea.clinica.com";

  const displayAvatar = user?.avatar || authUser?.avatar || (fixtureMatch as { avatar?: string })?.avatar;

  const displayRole =
    user?.roleLabel ||
    authUser?.especialidade ||
    fixtureMatch?.especialidade ||
    "Terapeuta Ocupacional";

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Menu de perfil de ${displayName}`}
          className="flex flex-row items-center gap-3 p-1 pr-3 rounded-full hover:bg-surface-alt transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <span className="text-[12px] font-medium text-foreground leading-tight max-w-45 truncate">
              {displayRole}
            </span>
            <span className="sr-only">{displayEmail}</span>
          </div>

          <ChevronDown
            className="w-4 h-4 text-foreground/60 transition-transform duration-200"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 rounded-2xl p-2 shadow-lg"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-[14px] font-semibold text-foreground-heading leading-tight">
              {displayName}
            </p>
            <p className="text-[12px] text-foreground leading-tight truncate">
              {displayEmail}
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-primary">
              <span>{displayRole}</span>
              <span className="font-mono text-foreground/60">{displayRegistro}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => onNavigateSettings?.()}
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
  );
}

function NavUserWithRouter(props: NavUserProps) {
  const navigate = useNavigate();
  return (
    <NavUserContent
      {...props}
      onNavigateLogin={() => navigate("/login", { replace: true })}
      onNavigateSettings={() => navigate("/configuracoes")}
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
      onNavigateSettings={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/configuracoes";
        }
      }}
    />
  );
}

export default NavUser;
