import { Play, FlaskConical } from "lucide-react";
import type { Jogo } from "../types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

interface JogoCardProps {
  jogo: Jogo;
  onIniciarSessao: (jogo: Jogo) => void;
  onModoLivre: (jogo: Jogo) => void;
}

export function JogoCard({
  jogo,
  onIniciarSessao,
  onModoLivre,
}: JogoCardProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card text-card-foreground p-4.5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md">
      {/* Lado Esquerdo: Imagem + Detalhes do Jogo */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-border flex items-center justify-center shadow-2xs">
          {jogo.bannerUrl ? (
            <img
              src={jogo.bannerUrl}
              alt={jogo.titulo}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted-foreground font-bold tracking-wider">
              InTEA
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {jogo.titulo}
            </h3>
            <Badge
              variant="secondary"
              className="rounded-md bg-muted text-muted-foreground border border-border px-2 py-0.5 text-2xs font-semibold"
            >
              v{jogo.versao}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {jogo.descricaoClinica}
          </p>
        </div>
      </div>

      {/* Lado Direito: Ações */}
      <div className="flex w-full sm:w-auto items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onModoLivre(jogo)}
          className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border-2 border-[#0b3294] text-[#0b3294] dark:border-blue-400 dark:text-blue-400 bg-transparent px-4 py-2 h-auto text-xs font-semibold shadow-2xs transition-all hover:bg-[#0b3294]/10 dark:hover:bg-blue-400/10"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Modo Livre
        </Button>

        <Button
          type="button"
          onClick={() => onIniciarSessao(jogo)}
          className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-[#0b3294] text-white hover:bg-[#0b3294]/90 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 h-auto text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Iniciar Sessão
        </Button>
      </div>
    </div>
  );
}
