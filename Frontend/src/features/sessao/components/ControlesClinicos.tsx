import { Button } from "@/shared/components/ui/button";
import {
  Play,
  Pause,
  Flag,
  Brain,
  FileText,
} from "lucide-react";

export interface ControlesClinicosProps {
  isPausado: boolean;
  nivelDda: number;
  onPausar: () => void;
  onRetomar: () => void;
  onAjustarDda: (nivel: number) => void;
  onAbrirModalFinalizar: () => void;
  onAbrirAnotacoes?: () => void;
  isModoLivre?: boolean;
  desabilitado?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE: ControlesClinicos (Front-end 1 — Hermeson Alves / Card 3.2)
 * Requisitos: RF13 (Ciclo da Sessão), RF16 (Anotações Clínicas),
 *              RF21 (Intervenção Manual do Terapeuta), RN01 (Modo Livre)
 * ============================================================================
 */

/**
 * Immediate clinical intervention panel for the active session (RF21).
 * Provides controls to pause/resume remote execution, tune DDA level (1 to 5),
 * access real-time clinical notes modal, and initiate formal conclusion flow.
 */
export function ControlesClinicos({
  isPausado,
  nivelDda,
  onPausar,
  onRetomar,
  onAjustarDda,
  onAbrirModalFinalizar,
  onAbrirAnotacoes,
  isModoLivre = false,
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
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl px-5 py-2.5 min-h-11 shadow-xs cursor-pointer transition-all"
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
            className="flex items-center gap-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 hover:bg-amber-100 font-semibold text-xs rounded-xl px-5 py-2.5 min-h-11 shadow-xs cursor-pointer transition-all"
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
          <Brain className="h-4 w-4 text-primary" />
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
                className={`min-w-11 min-h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed ${
                  isAtivo
                    ? "bg-primary text-primary-foreground shadow-xs scale-105"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {nivel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grupo 3: Ações Clínicas Rápidas (Anotações em Tempo Real) & Encerrar Sessão */}
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          data-testid="botao-abrir-anotacoes-cockpit"
          variant="outline"
          disabled={desabilitado || isModoLivre}
          onClick={onAbrirAnotacoes}
          title={
            isModoLivre
              ? "Partidas em Modo Livre não registram anotações no prontuário (RN01)"
              : "Anotações Clínicas da Sessão"
          }
          className="flex items-center justify-center gap-2 font-semibold text-xs rounded-xl min-h-11 min-w-11 px-4 py-2.5 border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="h-4 w-4 text-primary" />
          <span>Anotações</span>
        </Button>

        <Button
          type="button"
          data-testid="botao-finalizar-sessao"
          variant="destructive"
          disabled={desabilitado}
          onClick={onAbrirModalFinalizar}
          className="w-full sm:w-auto flex items-center justify-center gap-2 font-semibold text-xs rounded-xl min-h-11 px-5 py-2.5 shadow-xs cursor-pointer transition-all"
        >
          <Flag className="h-4 w-4" />
          <span>Finalizar Sessão</span>
        </Button>
      </div>
    </div>
  );
}