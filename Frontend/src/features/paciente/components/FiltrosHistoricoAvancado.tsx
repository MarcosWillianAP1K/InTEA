"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Filter, RotateCcw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { FiltrosHistorico } from "../types/historico.types";

/**
 * ============================================================================
 * COMPONENTE: FiltrosHistoricoAvancado (Barra de Filtros Temporais Longitudinais)
 * Conformidade: RF15 (Prontuário Longitudinal), RF19 (Filtros), RNF07 (Ergonomia)
 * Pure & Props-Driven: Componente determinístico orientado a props
 * ============================================================================
 */

export interface FiltrosHistoricoAvancadoProps {
  /** Filtros atualmente ativos */
  filtros: FiltrosHistorico;
  /** Callback disparado ao alterar o período ou as datas personalizadas */
  onAlterarFiltros: (novosFiltros: FiltrosHistorico) => void;
  /** Indicador de carregamento para desativar controles durante fetch */
  isLoading?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

type PeriodoOpcao = "7d" | "30d" | "3m" | "todos" | "personalizado";

interface OpcaoConfig {
  id: PeriodoOpcao;
  label: string;
  diasSubtrair?: number;
  mesesSubtrair?: number;
}

const OPCOES_PERIODO: OpcaoConfig[] = [
  { id: "7d", label: "Últimos 7 dias", diasSubtrair: 7 },
  { id: "30d", label: "Últimos 30 dias", diasSubtrair: 30 },
  { id: "3m", label: "Últimos 3 meses", mesesSubtrair: 3 },
  { id: "todos", label: "Todo o Histórico" },
  { id: "personalizado", label: "Personalizado" },
];

/**
 * Calcula a data ISO inicial retroativa com base na opção selecionada.
 */
function calcularDataInicio(opcao: OpcaoConfig, dataReferencia: Date = new Date()): string | undefined {
  if (opcao.id === "todos" || opcao.id === "personalizado") {
    return undefined;
  }

  const d = new Date(dataReferencia);
  if (opcao.diasSubtrair) {
    d.setDate(d.getDate() - opcao.diasSubtrair);
  } else if (opcao.mesesSubtrair) {
    d.setMonth(d.getMonth() - opcao.mesesSubtrair);
  }
  return d.toISOString().split("T")[0];
}

export const FiltrosHistoricoAvancado: React.FC<FiltrosHistoricoAvancadoProps> = ({
  filtros,
  onAlterarFiltros,
  isLoading = false,
  className,
}) => {
  const periodoAtivo: PeriodoOpcao = filtros.periodo || "30d";
  const [dataInicioInput, setDataInicioInput] = useState<string>(filtros.dataInicio || "");
  const [dataFimInput, setDataFimInput] = useState<string>(filtros.dataFim || "");

  // Sincroniza inputs locais quando filtros mudam externamente
  useEffect(() => {
    setDataInicioInput(filtros.dataInicio || "");
    setDataFimInput(filtros.dataFim || "");
  }, [filtros.dataInicio, filtros.dataFim]);

  const handleSelecionarPeriodo = (opcao: OpcaoConfig) => {
    if (isLoading) return;

    if (opcao.id === "personalizado") {
      onAlterarFiltros({
        ...filtros,
        periodo: "personalizado",
        dataInicio: dataInicioInput || undefined,
        dataFim: dataFimInput || undefined,
      });
      return;
    }

    if (opcao.id === "todos") {
      onAlterarFiltros({
        ...filtros,
        periodo: "todos",
        dataInicio: undefined,
        dataFim: undefined,
      });
      return;
    }

    const dataInicio = calcularDataInicio(opcao);
    const dataFim = new Date().toISOString().split("T")[0];

    onAlterarFiltros({
      ...filtros,
      periodo: opcao.id,
      dataInicio,
      dataFim,
    });
  };

  const handleAplicarPersonalizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    onAlterarFiltros({
      ...filtros,
      periodo: "personalizado",
      dataInicio: dataInicioInput || undefined,
      dataFim: dataFimInput || undefined,
    });
  };

  const handleLimparFiltros = () => {
    if (isLoading) return;
    const defaultDataInicio = calcularDataInicio(OPCOES_PERIODO[1]); // 30d padrão
    const defaultDataFim = new Date().toISOString().split("T")[0];

    setDataInicioInput("");
    setDataFimInput("");
    onAlterarFiltros({
      ...filtros,
      periodo: "30d",
      dataInicio: defaultDataInicio,
      dataFim: defaultDataFim,
    });
  };

  const isPersonalizadoAtivo = periodoAtivo === "personalizado";

  return (
    <div
      data-testid="filtros-historico-avancado"
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-2xs flex flex-col gap-3.5",
        className,
      )}
      aria-label="Filtros avançados do histórico clínico"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Título e Ícone dos Filtros */}
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Filtrar Período de Evolução</span>
        </div>

        {/* Botão de Reset */}
        {(filtros.periodo !== "30d" || filtros.dataInicio || filtros.dataFim) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLimparFiltros}
            disabled={isLoading}
            data-testid="btn-resetar-filtros"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer min-h-11"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restaurar Padrão (30d)</span>
          </Button>
        )}
      </div>

      {/* Grade de Botões de Período Rápido (RNF07: Alvos de Toque >= 44x44px) */}
      <div
        role="group"
        aria-label="Seleção rápida de período de análise"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
      >
        {OPCOES_PERIODO.map((opcao) => {
          const isAtivo = periodoAtivo === opcao.id;

          return (
            <button
              key={opcao.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelecionarPeriodo(opcao)}
              aria-pressed={isAtivo}
              data-testid={`btn-periodo-${opcao.id}`}
              className={cn(
                "inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer min-h-11 min-h-11 border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                isAtivo
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                  : "bg-muted/30 text-foreground/80 border-border/80 hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span>{opcao.label}</span>
            </button>
          );
        })}
      </div>

      {/* Painel Expansível de Intervalo Personalizado (RF19) */}
      {isPersonalizadoAtivo && (
        <form
          onSubmit={handleAplicarPersonalizado}
          data-testid="painel-intervalo-personalizado"
          className="pt-2 border-t border-border/60 flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1.5 flex-1 min-w-40">
            <label
              htmlFor="filtro-data-inicio"
              className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"
            >
              <Calendar className="h-3 w-3 text-primary" />
              <span>Data Inicial</span>
            </label>
            <input
              id="filtro-data-inicio"
              type="date"
              value={dataInicioInput}
              onChange={(e) => setDataInicioInput(e.target.value)}
              disabled={isLoading}
              data-testid="input-data-inicio"
              className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-40">
            <label
              htmlFor="filtro-data-fim"
              className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"
            >
              <Calendar className="h-3 w-3 text-primary" />
              <span>Data Final</span>
            </label>
            <input
              id="filtro-data-fim"
              type="date"
              value={dataFimInput}
              onChange={(e) => setDataFimInput(e.target.value)}
              disabled={isLoading}
              data-testid="input-data-fim"
              className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading || (!dataInicioInput && !dataFimInput)}
            data-testid="btn-aplicar-datas"
            className="min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            Aplicar Intervalo
          </Button>
        </form>
      )}
    </div>
  );
};

export default FiltrosHistoricoAvancado;
