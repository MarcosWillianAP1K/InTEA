import type { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export interface FocusLayoutProps {
  children?: ReactNode;
  titulo?: string;
  subtitulo?: string;
  onVoltar?: () => void;
  showTopbar?: boolean;
}

export function FocusLayout({
  children,
  titulo,
  subtitulo,
  onVoltar,
  showTopbar = false,
}: FocusLayoutProps) {
  const navigate = useNavigate();

  const handleVoltar = () => {
    if (onVoltar) {
      onVoltar();
    } else {
      navigate("/jogos");
    }
  };

  return (
    <div
      data-testid="focus-layout"
      className="min-h-screen bg-background text-foreground flex flex-col w-full"
    >
      {showTopbar && (
        <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoltar}
              className="rounded-xl text-xs gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
            {titulo && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{titulo}</span>
                {subtitulo && (
                  <span className="text-xs text-muted-foreground">{subtitulo}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Modo Foco Clínico
            </span>
          </div>
        </header>
      )}
      <div className="flex flex-1 flex-col w-full">
        {children ?? <Outlet />}
      </div>
    </div>
  );
}

export default FocusLayout;
