import { Button } from "@/shared/components/ui/button";
import {
  Play,
  Pause,
  Sliders,
  Flag,
  Brain,
} from "lucide-react";

export interface ControlesClinicosProps {
  isPausado: boolean;
  nivelDda: number;
  onPausar: () => void;
  onRetomar: () => void;
  onAjustarDda: (nivel: number) => void;
  onAbrirModalFinalizar: () => void;
  desabilitado?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE: ControlesClinicos (Front-end 1 — Hermeson Alves / Card 3.2)
 * Requisitos: RF13 (Ciclo da Sessão), RF21 (Intervenção Manual do Terapeuta)
 * ============================================================================
 */

/**
 * Painel de intervenção clínica imediata do terapeuta na sessão ativa (RF21).
 * Fornece botões para pausar/retomar a execução remota, sintonizar o nível DDA (1 a 5)
 * e disparar o fluxo de encerramento formal da intervenção.
 */
export function ControlesClinicos({
  isPausado,
  nivelDda,
  onPausar,
  onRetomar,
  onAjustarDda,
  onAbrirModalFinalizar,
  desabilitado = false,
}: ControlesClinicosProps) {
  return (
    <div
      data-testid="painel-controles-clinicos"
      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs"
    >
      {/* Grupo 1: Pausar e Retomar */}
      <div className="flex items-center gap-3">
        {isPausado ? (
          <Button
            type="button"
            data-testid="botao-retomar"
            variant="default"
            disabled={desabilitado}
            onClick={onRetomar}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl px-5 py-2.5 shadow-xs cursor-pointer transition-all"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Retomar Jogo</span>
          </Button>
        ) : (
          <Button
            type="button"
            data-testid="botao-pausar"
            variant="outline"
            disabled={desabilitado}
            onClick={onPausar}
            className="flex items-center gap-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 hover:bg-amber-100 font-semibold text-xs rounded-xl px-5 py-2.5 shadow-xs cursor-pointer transition-all"
          >
            <Pause className="h-4 w-4" />
            <span>Pausar Jogo</span>
          </Button>
        )}

        <span className="text-2xs text-muted-foreground hidden md:inline">
          {isPausado ? "Sessão congelada no tablet" : "Executando em tempo real"}
        </span>
      </div>

      {/* Grupo 2: Modulação de Dificuldade DDA */}
      <div className="flex items-center gap-3 border-y sm:border-y-0 sm:border-x border-border py-2 sm:py-0 sm:px-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Brain className="h-4 w-4 text-[#0b3294] dark:text-blue-400" />
          <span>Dificuldade DDA:</span>
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((nivel) => {
            const isAtivo = nivelDda === nivel;
            return (
              <button
                key={nivel}
                type="button"
                data-testid={`btn-dda-${nivel}`}
                disabled={desabilitado}
                onClick={() => onAjustarDda(nivel)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  isAtivo
                    ? "bg-[#0b3294] text-white shadow-xs scale-105"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {nivel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grupo 3: Encerrar Sessão */}
      <div>
        <Button
          type="button"
          data-testid="botao-finalizar-sessao"
          variant="destructive"
          disabled={desabilitado}
          onClick={onAbrirModalFinalizar}
          className="w-full sm:w-auto flex items-center justify-center gap-2 font-semibold text-xs rounded-xl px-5 py-2.5 shadow-xs cursor-pointer transition-all"
        >
          <Flag className="h-4 w-4" />
          <span>Finalizar Sessão</span>
        </Button>
      </div>
    </div>
  );
}
