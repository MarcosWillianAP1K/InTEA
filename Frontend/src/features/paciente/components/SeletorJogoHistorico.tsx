"use client";

import React from "react";
import { LayoutGrid, Gamepad2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { ResumoJogoPaciente } from "../types/historico.types";

/**
 * ============================================================================
 * COMPONENTE: SeletorJogoHistorico (Seletor de Jogos para Análise Longitudinal)
 * Conformidade: RF15 (Prontuário Longitudinal), RF19 (Filtros), RNF07 (Ergonomia)
 * Pure & Props-Driven: 100% determinístico, sem efeitos colaterais internos
 * ============================================================================
 */

export interface SeletorJogoHistoricoProps {
  /** Catálogo de jogos já experimentados pelo paciente com totais de sessões */
  jogos: ResumoJogoPaciente[];
  /** ID do jogo selecionado para filtragem de métricas, ou null para visão geral */
  jogoSelecionadoId: string | null;
  /** Callback disparado ao selecionar um jogo ou voltar para a visão geral */
  onSelecionarJogo: (jogoId: string | null) => void;
  /** Indicador de estado de carregamento de dados (Skeleton State) */
  isLoading?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

export const SeletorJogoHistorico: React.FC<SeletorJogoHistoricoProps> = ({
  jogos,
  jogoSelecionadoId,
  onSelecionarJogo,
  isLoading = false,
  className,
}) => {
  // Estado de Carregamento (Skeleton Loader proporcional - RNF07 / Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="seletor-jogo-skeleton"
        className={cn("flex flex-wrap items-center gap-2.5", className)}
        aria-busy="true"
        aria-label="Carregando seletor de jogos do paciente"
      >
        <Skeleton className="h-11 w-36 rounded-xl" />
        <Skeleton className="h-11 w-44 rounded-xl" />
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>
    );
  }

  // Estado Vazio (Paciente não jogou nenhum jogo terapêutico ainda)
  if (!jogos || jogos.length === 0) {
    return (
      <div
        data-testid="seletor-jogo-vazio"
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground",
          className,
        )}
      >
        <Gamepad2 className="h-4 w-4 text-muted-foreground/70 shrink-0" />
        <span>Nenhum jogo terapêutico registrado no histórico clínico deste paciente.</span>
      </div>
    );
  }

  const isVisaoGeral = jogoSelecionadoId === null;

  return (
    <nav
      aria-label="Seletor de contexto do histórico clínico"
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-testid="seletor-jogo-historico"
    >
      {/* Botão: Visão Geral de Engajamento */}
      <button
        type="button"
        onClick={() => onSelecionarJogo(null)}
        aria-pressed={isVisaoGeral}
        data-testid="btn-visao-geral"
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer min-h-11 min-h-11 min-w-11 border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          isVisaoGeral
            ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
            : "bg-card text-foreground/80 border-border hover:bg-muted/40 hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Visão Geral</span>
        <Badge
          variant={isVisaoGeral ? "secondary" : "outline"}
          className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-md font-medium",
            isVisaoGeral
              ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
              : "bg-muted text-muted-foreground",
          )}
        >
          Universal
        </Badge>
      </button>

      {/* Lista de Jogos do Catálogo do Paciente */}
      {jogos.map((jogo) => {
        const idJogo = jogo.jogo_id || String(jogo.id);
        const isSelected = String(idJogo) === String(jogoSelecionadoId);

        return (
          <button
            key={idJogo}
            type="button"
            onClick={() => onSelecionarJogo(String(idJogo))}
            aria-pressed={isSelected}
            data-testid={`btn-jogo-${idJogo}`}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer min-h-11 min-h-11 min-w-11 border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                : "bg-card text-foreground/80 border-border hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <Gamepad2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-35 sm:max-w-50" title={jogo.nome}>
              {jogo.nome}
            </span>
            <Badge
              variant={isSelected ? "secondary" : "outline"}
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-md font-medium shrink-0",
                isSelected
                  ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {jogo.total_sessoes} {jogo.total_sessoes === 1 ? "sessão" : "sessões"}
            </Badge>
          </button>
        );
      })}
    </nav>
  );
};

export default SeletorJogoHistorico;
