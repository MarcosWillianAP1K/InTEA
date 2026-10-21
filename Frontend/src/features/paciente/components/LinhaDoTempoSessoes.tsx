"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ArrowRight,
  ExternalLink,
  Calendar,
  Timer,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { SessaoHistoricoItem } from "../types/historico.types";

/**
 * ============================================================================
 * COMPONENTE: LinhaDoTempoSessoes (Linha do Tempo Cronológica de Intervenções)
 * Conformidade: RF15 (Prontuário Longitudinal), RN04, RN05, RNF07 (Ergonomia)
 * Pure & Props-Driven: Componente determinístico orientado a props
 * ============================================================================
 */

export interface LinhaDoTempoSessoesProps {
  /** Lista cronológica de sessões registradas para o paciente ou jogo */
  sessoes: SessaoHistoricoItem[];
  /** Indicador de estado de carregamento de dados (Skeleton State) */
  isLoading?: boolean;
  /** Nome do jogo selecionado para contexto visual ou undefined para visão geral */
  nomeJogoFiltro?: string;
  /** Callback opcional customizado para navegar até o resultado da sessão */
  onNavegarResultado?: (sessaoId: string) => void;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Formata segundos em texto amigável de duração (ex: "18m 45s" ou "12m").
 */
function formatarDuracao(segundos?: number): string {
  if (!segundos || segundos <= 0) return "< 1 min";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Formata data e hora ISO para o padrão pt-BR.
 */
function formatarDataHora(dataIso?: string): { data: string; hora: string } {
  if (!dataIso) return { data: "Data não registrada", hora: "" };
  try {
    const d = new Date(dataIso);
    return {
      data: d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      hora: d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { data: "Data inválida", hora: "" };
  }
}

export const LinhaDoTempoSessoes: React.FC<LinhaDoTempoSessoesProps> = ({
  sessoes,
  isLoading = false,
  nomeJogoFiltro,
  onNavegarResultado,
  className,
}) => {
  const navigate = useNavigate();

  const handleVerRelatorio = (sessaoId: string) => {
    if (onNavegarResultado) {
      onNavegarResultado(sessaoId);
    } else {
      navigate(`/sessao/${sessaoId}/resultado`);
    }
  };

  // Estado de Carregamento (Skeleton Loader proporcional - RNF07 / Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="linha-do-tempo-skeleton"
        className={cn("rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-4", className)}
        aria-busy="true"
        aria-label="Carregando linha do tempo de sessões"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Estado Vazio (Sem sessões registradas no filtro/jogo)
  if (!sessoes || sessoes.length === 0) {
    return (
      <div
        data-testid="linha-do-tempo-sessoes"
        className={cn(
          "rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center flex flex-col items-center justify-center gap-2.5 shadow-2xs",
          className,
        )}
      >
        <div data-testid="linha-do-tempo-vazia" className="flex flex-col items-center justify-center gap-2.5">
          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Nenhuma sessão registrada</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            {nomeJogoFiltro
              ? `O paciente ainda não possui sessões registradas para o jogo "${nomeJogoFiltro}".`
              : "Nenhuma intervenção clínica foi realizada no intervalo de datas selecionado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="linha-do-tempo-sessoes"
      className={cn("rounded-2xl border border-border bg-card shadow-2xs overflow-hidden", className)}
      aria-label="Linha do tempo cronológica de sessões do paciente"
    >
      {/* Cabeçalho da Linha do Tempo */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">
              Linha do Tempo de Intervenções
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {nomeJogoFiltro ? `Sessões de ${nomeJogoFiltro}` : "Histórico cronológico universal"}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
          {sessoes.length} {sessoes.length === 1 ? "sessão" : "sessões"}
        </Badge>
      </div>

      {/* Lista de Sessões em Linha do Tempo */}
      <div className="p-4 sm:p-5">
        <div className="relative border-l-2 border-border/70 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4">
          {sessoes.map((sessao, index) => {
            const dataIso = sessao.data_hora_fim || sessao.data_hora_inicio;
            const { data, hora } = formatarDataHora(dataIso);

            const isFinalizada = sessao.status_sessao === "finalizada";
            const isInterrompida =
              sessao.status_sessao === "interrompida" ||
              sessao.status_sessao === "desistida" ||
              sessao.status_sessao === "cancelada";

            return (
              <div
                key={sessao.sessao_id || `sessao-index-${index}`}
                data-testid={`card-sessao-${sessao.sessao_id}`}
                className="relative group"
              >
                {/* Marcador Circular na Linha do Tempo */}
                <div
                  className={cn(
                    "absolute -left-[23px] sm:-left-[31px] top-3.5 h-3.5 w-3.5 rounded-full border-2 bg-background transition-transform group-hover:scale-125",
                    isFinalizada
                      ? "border-emerald-500 text-emerald-500 bg-emerald-500/20"
                      : isInterrompida
                        ? "border-amber-500 text-amber-500 bg-amber-500/20"
                        : "border-primary text-primary bg-primary/20",
                  )}
                  aria-hidden="true"
                />

                {/* Card da Sessão */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  {/* Informações Principais da Sessão */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge de Status Semântico: Verde para Concluída, Âmbar para Interrompida */}
                      {isFinalizada ? (
                        <Badge
                          data-testid="badge-status-concluida"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-semibold gap-1 px-2 py-0.5"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Concluída</span>
                        </Badge>
                      ) : isInterrompida ? (
                        <Badge
                          data-testid="badge-status-interrompida"
                          className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-semibold gap-1 px-2 py-0.5"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>Interrompida</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-semibold text-muted-foreground gap-1 px-2 py-0.5"
                        >
                          <span>{sessao.status_sessao}</span>
                        </Badge>
                      )}

                      {/* Data e Hora */}
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{data}</span>
                        {hora && <span className="text-muted-foreground font-normal">às {hora}</span>}
                      </span>
                    </div>

                    {/* Metadados adicionais: Duração e Terapeuta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3 text-primary" />
                        <span>Duração: {formatarDuracao(sessao.tempo_total_segundos)}</span>
                      </span>

                      {sessao.terapeuta_id && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>Terapeuta #{sessao.terapeuta_id.slice(0, 8)}</span>
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-muted-foreground/70">
                        ID: {sessao.sessao_id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Botão de Ação: Atalho para Relatório da Sessão (RNF07: Toque >= 44x44px) */}
                  <div className="flex items-center self-end sm:self-center shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerRelatorio(sessao.sessao_id)}
                      data-testid={`btn-ver-relatorio-${sessao.sessao_id}`}
                      className="min-h-[44px] px-3.5 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer transition-all shadow-2xs select-none"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Ver Resultados</span>
                      <ArrowRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LinhaDoTempoSessoes;
