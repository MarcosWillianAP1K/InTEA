"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ArrowRight,
  Calendar,
  Timer,
  Activity,
  UserCheck,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { SessaoHistoricoItem, EspecialistaHistorico } from "../types/historico.types";

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
  /** ID do especialista selecionado para filtrar localmente a linha do tempo (Issue #187) */
  especialistaFiltroId?: string;
  /** Lista explícita de especialistas da equipe multidisciplinar (fallback: extraído de sessoes) */
  especialistas?: EspecialistaHistorico[];
  /** Callback disparado quando o especialista selecionado mudar internamente no componente */
  onFiltrarEspecialista?: (terapeutaId?: string) => void;
  /** Callback opcional customizado para navegar até o resultado da sessão */
  onNavegarResultado?: (sessaoId: string) => void;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Formata segundos em texto amigável de duração (ex: "18m 45s" ou "12m").
 */
/**
 * Formats duration in seconds into localized human-readable time representation.
 * Duration Formatting: Displays minutes and seconds ("X min Y s") or "0 s" for zero/empty durations.
 *
 * @param segundos - Total duration in seconds
 * @returns Formatted duration string
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
/**
 * Formats an ISO date string into separated date and time string parts.
 * Date Formatting: Produces localized date (DD/MM/YYYY) and 24-hour time (HH:mm).
 *
 * @param dataIso - ISO 8601 formatted date string
 * @returns Object containing formatted date and time strings
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

/**
 * Renders chronological session timeline with clinical status badges and comparison selectors (RF15).
 * Session History (RF15, RF19): Visualizes sequential interventions and enables pairwise session comparison.
 *
 * @param props - Component properties containing session history items and selection callbacks
 * @returns Interactive chronological timeline component
 */
export const LinhaDoTempoSessoes: React.FC<LinhaDoTempoSessoesProps> = ({
  sessoes,
  isLoading = false,
  nomeJogoFiltro,
  especialistaFiltroId,
  especialistas,
  onFiltrarEspecialista,
  onNavegarResultado,
  className,
}) => {
  const navigate = useNavigate();

  // Especialistas disponíveis (populado dinamicamente de sessoes se lista externa não for fornecida)
  const especialistasDisponiveis = useMemo(() => {
    if (especialistas && especialistas.length > 0) {
      return especialistas;
    }
    const mapa = new Map<string, EspecialistaHistorico>();
    for (const s of sessoes) {
      if (s.terapeuta_id) {
        if (!mapa.has(s.terapeuta_id)) {
          mapa.set(s.terapeuta_id, {
            id: s.terapeuta_id,
            nome: s.terapeuta_nome || `Terapeuta #${s.terapeuta_id.slice(0, 8)}`,
            especialidade: s.especialidade || null,
            registro_profissional: s.registro_profissional || null,
          });
        }
      }
    }
    return Array.from(mapa.values());
  }, [sessoes, especialistas]);

  // Estado interno sincronizado com prop especialistaFiltroId
  const [filtroEspecialistaInterno, setFiltroEspecialistaInterno] = useState<string | undefined>(
    especialistaFiltroId,
  );

  useEffect(() => {
    setFiltroEspecialistaInterno(especialistaFiltroId);
  }, [especialistaFiltroId]);

  const especialistaAtivoId =
    filtroEspecialistaInterno;

  const handleMudarEspecialista = (novoId?: string) => {
    setFiltroEspecialistaInterno(novoId);
    onFiltrarEspecialista?.(novoId);
  };

  // Filtragem reativa imediata preservando demais condições
  const sessoesExibidas = useMemo(() => {
    if (!especialistaAtivoId) return sessoes;
    return sessoes.filter((s) => s.terapeuta_id === especialistaAtivoId);
  }, [sessoes, especialistaAtivoId]);

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
      <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Especialista da Equipe Multidisciplinar (Issue #187) */}
          {especialistasDisponiveis.length > 0 && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <select
                aria-label="Filtrar sessões por especialista responsável"
                data-testid="select-filtro-especialista-timeline"
                value={especialistaAtivoId || ""}
                onChange={(e) => handleMudarEspecialista(e.target.value || undefined)}
                className="min-h-11 h-11 px-2.5 py-1 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
              >
                <option value="">Todas as Sessões da Equipe Multidisciplinar</option>
                {especialistasDisponiveis.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nome}{esp.especialidade ? ` • ${esp.especialidade}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 shrink-0">
            {sessoesExibidas.length} {sessoesExibidas.length === 1 ? "sessão" : "sessões"}
          </Badge>
        </div>
      </div>

      {/* Lista de Sessões em Linha do Tempo */}
      <div className="p-4 sm:p-5">
        {sessoesExibidas.length === 0 ? (
          <div
            data-testid="empty-state-especialista"
            className="p-8 text-center flex flex-col items-center justify-center gap-2.5"
          >
            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <User className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Nenhuma sessão encontrada para este especialista
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Não há intervenções registradas para o profissional selecionado com os filtros atuais.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleMudarEspecialista(undefined)}
              data-testid="btn-limpar-filtro-especialista-timeline"
              className="min-h-11 px-3.5 text-xs font-semibold cursor-pointer"
            >
              Ver todas as sessões da equipe
            </Button>
          </div>
        ) : (
          <div className="relative border-l-2 border-border/70 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4">
            {sessoesExibidas.map((sessao, index) => {
            const dataIso = sessao.data_hora_fim || sessao.data_hora_inicio;
            const { data, hora } = formatarDataHora(dataIso);

            const isPausada = sessao.status_sessao === "pausada";
            const isEmAndamento =
              sessao.status_sessao === "em_andamento" ||
              sessao.status_sessao === "conectado" ||
              isPausada;
            const isFinalizada = sessao.status_sessao === "finalizada";
            const isInterrompida =
              sessao.status_sessao === "interrompida" ||
              sessao.status_sessao === "interrompida_por_queda" ||
              sessao.status_sessao === "desistida" ||
              sessao.status_sessao === "cancelada";

            const duracaoCalculada =
              sessao.tempo_total_segundos ??
              sessao.duracao_segundos ??
              (sessao.data_hora_inicio && sessao.data_hora_fim
                ? Math.max(
                    0,
                    Math.round(
                      (new Date(sessao.data_hora_fim).getTime() -
                        new Date(sessao.data_hora_inicio).getTime()) /
                        1000,
                    ),
                  )
                : undefined);

            return (
              <div
                key={sessao.sessao_id || `sessao-index-${index}`}
                data-testid={`card-sessao-${sessao.sessao_id}`}
                className="relative group"
              >
                {/* Marcador Circular na Linha do Tempo */}
                <div
                  className={cn(
                    "absolute -left-5.75 sm:-left-7.75 top-3.5 h-3.5 w-3.5 rounded-full border-2 bg-background transition-transform group-hover:scale-125",
                    isEmAndamento
                      ? "border-amber-500 text-amber-500 bg-amber-500/20"
                      : isFinalizada
                        ? "border-emerald-500 text-emerald-500 bg-emerald-500/20"
                        : isInterrompida
                          ? "border-destructive text-destructive bg-destructive/20"
                          : "border-primary text-primary bg-primary/20",
                  )}
                  aria-hidden="true"
                />

                {/* Card da Sessão */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  {/* Informações Principais da Sessão */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge de Status Semântico: Amarelo para Em Andamento, Verde para Concluída */}
                      {isPausada ? (
                        <Badge
                          data-testid="badge-status-pausada"
                          className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[11px] font-semibold gap-1 px-2 py-0.5"
                        >
                          <span>Em Pausa</span>
                        </Badge>
                      ) : isEmAndamento ? (
                        <Badge
                          data-testid="badge-status-em-andamento"
                          className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[11px] font-semibold gap-1 px-2 py-0.5"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Em Andamento</span>
                        </Badge>
                      ) : isFinalizada ? (
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
                          className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold gap-1 px-2 py-0.5"
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
                        <span>Duração: {formatarDuracao(duracaoCalculada)}</span>
                      </span>

                      {sessao.terapeuta_nome ? (
                        <span
                          data-testid={`terapeuta-info-${sessao.sessao_id}`}
                          className="flex items-center gap-1 font-medium text-foreground/90"
                        >
                          <User className="h-3 w-3 text-primary" />
                          <span>{sessao.terapeuta_nome}</span>
                          {sessao.especialidade && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              ({sessao.especialidade})
                            </span>
                          )}
                        </span>
                      ) : sessao.terapeuta_id ? (
                        <span
                          data-testid={`terapeuta-info-${sessao.sessao_id}`}
                          className="flex items-center gap-1"
                        >
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>Terapeuta #{sessao.terapeuta_id.slice(0, 8)}</span>
                        </span>
                      ) : null}

                      <span className="text-[11px] font-mono text-muted-foreground/70">
                        ID: {sessao.sessao_id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Botão de Ação: Atalho para Cockpit (se em andamento) ou Relatório (se finalizada) (RNF07: Toque >= 44x44px) */}
                  <div className="flex items-center self-end sm:self-center shrink-0">
                    {isEmAndamento ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sessao/${sessao.sessao_id}/monitoramento`)}
                        data-testid={`btn-cockpit-${sessao.sessao_id}`}
                        className="min-h-11 px-3.5 text-xs font-semibold gap-1.5 border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-100 cursor-pointer transition-all shadow-2xs select-none"
                      >
                        <Activity className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Cockpit</span>
                        <ArrowRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerRelatorio(sessao.sessao_id)}
                        data-testid={`btn-ver-relatorio-${sessao.sessao_id}`}
                        className="min-h-11 px-3.5 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer transition-all shadow-2xs select-none"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Ver Resultados</span>
                        <ArrowRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinhaDoTempoSessoes;
