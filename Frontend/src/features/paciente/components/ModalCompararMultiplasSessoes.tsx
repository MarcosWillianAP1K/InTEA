"use client";

import { useState, useMemo } from "react";
import {
  Gamepad2,
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart3,
  SlidersHorizontal,
} from "lucide-react";
import type { Sessao } from "@/features/sessao/types/sessao.types";
import {
  calcularDeltaMetrica,
  type PolaridadeClinica,
  type ResultadoCalculoDelta,
} from "./TabelaComparativaMetricas";
import { SparklineTendencia } from "./SparklineTendencia";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export interface ModalCompararMultiplasSessoesProps {
  isOpen: boolean;
  onClose: () => void;
  sessoes: Sessao[];
  pacienteNome?: string;
}

interface MetricaLinhaMultiSessao {
  id: string;
  nome: string;
  descricao: string;
  unidade: string;
  polaridade: PolaridadeClinica;
  extrairValor: (sessao: Sessao) => number | null | undefined;
  formatarValor: (valor: number | null | undefined) => string;
}

type SessaoComMetricas = Sessao & {
  metricas_consolidadas?: {
    duracao_segundos?: number | null;
    taxa_conclusao?: number | null;
    estabilidade_foco?: number | null;
    tempo_medio_resposta_ms?: number | null;
    pontuacao_geral?: number | null;
    total_acertos?: number | null;
    total_erros?: number | null;
    intervencoes_dda?: number | null;
  } | null;
};

/**
 * ============================================================================
 * COMPONENTE: ModalCompararMultiplasSessoes (InTEA)
 * Comparação Longitudinal e Analítica Escalável para mais de 2 sessões clínicas.
 * Conformidade: RF15, RF19, RN02, RNF07 (área mínima de toque 44x44px), WCAG 2.1 AA.
 * ============================================================================
 */
export function ModalCompararMultiplasSessoes({
  isOpen,
  onClose,
  sessoes,
  pacienteNome,
}: ModalCompararMultiplasSessoesProps) {
  // Ordena todas as sessões cronologicamente (da mais antiga para a mais recente)
  const sessoesOrdenadas = useMemo(() => {
    if (!sessoes || sessoes.length === 0) return [];
    return [...sessoes].sort((a, b) => {
      const dataA = new Date(a.data_hora_inicio || a.created_at || 0).getTime();
      const dataB = new Date(b.data_hora_inicio || b.created_at || 0).getTime();
      return dataA - dataB;
    });
  }, [sessoes]);

  // Índice da sessão de referência inicial (Baseline) - padrão: 0 (a mais antiga)
  const [indiceBaseline, setIndiceBaseline] = useState<number>(0);

  // Verificação de Homogeneidade dos Jogos (RN02 / Arquitetura Dual de Histórico)
  const jogosDistintos = useMemo(() => {
    const mapa = new Map<string, string>();
    sessoesOrdenadas.forEach((s) => {
      const id = s.jogo_id || s.jogo?.id || "jogo-padrao";
      const nome = s.jogo?.nome || s.jogo?.titulo || "Jogo Terapêutico";
      mapa.set(id, nome);
    });
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [sessoesOrdenadas]);

  const mesmoJogo = jogosDistintos.length <= 1;
  const nomeJogoPrincipal = jogosDistintos[0]?.nome || "Jogos Diversos";

  // Formatação de datas e durações
  const formatarDataHora = (iso?: string | null) => {
    if (!iso) return "N/I";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const formatarDataCurta = (iso?: string | null) => {
    if (!iso) return "N/I";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const formatarDuracao = (segundos?: number | null) => {
    if (!segundos || segundos <= 0) return "N/I";
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    if (min === 0) return `${seg}s`;
    return seg > 0 ? `${min}m ${seg}s` : `${min} min`;
  };

  const obterDuracao = (s: Sessao) =>
    (s as SessaoComMetricas).duracao_segundos ||
    (s as SessaoComMetricas).metricas_consolidadas?.duracao_segundos ||
    0;

  // Intervalo total entre a primeira e a última sessão selecionada
  const intervaloTotalDias = useMemo(() => {
    if (sessoesOrdenadas.length < 2) return null;
    const primeira = sessoesOrdenadas[0];
    const ultima = sessoesOrdenadas[sessoesOrdenadas.length - 1];
    if (!primeira.data_hora_inicio || !ultima.data_hora_inicio) return null;
    try {
      const t1 = new Date(primeira.data_hora_inicio).getTime();
      const t2 = new Date(ultima.data_hora_inicio).getTime();
      const diff = Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
      if (diff === 0) return "Todas as sessões realizadas no mesmo dia";
      if (diff === 1) return "Intervalo total de 1 dia entre a primeira e a última sessão";
      return `Intervalo total de ${diff} dias entre a 1ª e a última sessão`;
    } catch {
      return null;
    }
  }, [sessoesOrdenadas]);

  // Definição das métricas analisadas
  const metricasConfig: MetricaLinhaMultiSessao[] = useMemo(() => {
    return [
      {
        id: "taxa_conclusao",
        nome: "Taxa de Conclusão",
        descricao: "Percentual completado das metas e fases propostas",
        unidade: "%",
        polaridade: "maior_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.taxa_conclusao ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v}%` : "—"),
      },
      {
        id: "estabilidade_foco",
        nome: "Estabilidade de Foco",
        descricao: "Atenção sustentada sem dispersão visual ou motora",
        unidade: "%",
        polaridade: "maior_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.estabilidade_foco ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v}%` : "—"),
      },
      {
        id: "tempo_medio_resposta_ms",
        nome: "Tempo Médio de Reação",
        descricao: "Latência média entre o estímulo apresentado e a resposta",
        unidade: "ms",
        polaridade: "menor_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.tempo_medio_resposta_ms ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v} ms` : "—"),
      },
      {
        id: "pontuacao_geral",
        nome: "Pontuação Geral",
        descricao: "Escore lúdico consolidado alcançado",
        unidade: "pts",
        polaridade: "maior_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.pontuacao_geral ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v} pts` : "—"),
      },
      {
        id: "total_acertos",
        nome: "Total de Acertos",
        descricao: "Respostas corretas sem auxílio direto",
        unidade: "acertos",
        polaridade: "maior_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.total_acertos ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v}` : "—"),
      },
      {
        id: "total_erros",
        nome: "Total de Erros / Frustração",
        descricao: "Falhas de seleção e toques repetidos em alvos incorretos",
        unidade: "erros",
        polaridade: "menor_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.total_erros ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v}` : "—"),
      },
      {
        id: "intervencoes_dda",
        nome: "Intervenções do Motor DDA",
        descricao: "Reajustes automáticos de dificuldade pelo motor de IA",
        unidade: "ações",
        polaridade: "menor_melhor",
        extrairValor: (s) => (s as SessaoComMetricas).metricas_consolidadas?.intervencoes_dda ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v}` : "—"),
      },
      {
        id: "estresse_inicial",
        nome: "Nível de Estresse Inicial",
        descricao: "Escala clínica pré-sessão de ansiedade/agitação (1 a 5)",
        unidade: "/5",
        polaridade: "menor_melhor",
        extrairValor: (s) => s.contexto_dda_json?.estresse_inicial ?? null,
        formatarValor: (v) => (v !== null && v !== undefined ? `${v}/5` : "—"),
      },
      {
        id: "duracao_sessao",
        nome: "Duração Efetiva",
        descricao: "Tempo total de engajamento ativo no game",
        unidade: "tempo",
        polaridade: "maior_melhor",
        extrairValor: (s) => obterDuracao(s),
        formatarValor: (v) => (v !== null && v !== undefined ? formatarDuracao(v) : "—"),
      },
    ];
  }, []);

  // Sessão de referência selecionada para cálculo de Delta
  const sessaoBaseReferencia = sessoesOrdenadas[indiceBaseline] || sessoesOrdenadas[0];
  const sessaoMaisRecente = sessoesOrdenadas[sessoesOrdenadas.length - 1];

  const renderBadgeDelta = (calculo: ResultadoCalculoDelta, polaridade: PolaridadeClinica) => {
    switch (calculo.statusClinico) {
      case "melhora":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
            data-testid="badge-delta-melhora"
          >
            {polaridade === "menor_melhor" ? (
              <TrendingDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{calculo.textoFormatado}</span>
          </span>
        );
      case "regressao":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs"
            data-testid="badge-delta-regressao"
          >
            {polaridade === "menor_melhor" ? (
              <TrendingUp className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            )}
            <span>{calculo.textoFormatado}</span>
          </span>
        );
      case "estavel":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
            data-testid="badge-delta-estavel"
          >
            <Minus className="h-3 w-3 text-slate-500" />
            <span>0.0%</span>
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
            data-testid="badge-delta-indeterminado"
          >
            <span>N/D</span>
          </span>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent
        className="w-full sm:max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title-multiplas-sessoes"
        aria-describedby="dialog-desc-multiplas-sessoes"
        data-testid="modal-comparar-multiplas-sessoes"
      >
        {/* Cabeçalho do Modal */}
        <DialogHeader className="border-b border-border pb-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle
                  id="dialog-title-multiplas-sessoes"
                  className="text-xl font-bold tracking-tight text-foreground"
                >
                  Comparação Analítica Multi-Sessões
                </DialogTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  {mesmoJogo ? nomeJogoPrincipal : `${jogosDistintos.length} Jogos Distintos`}
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold">
                  {sessoesOrdenadas.length} Sessões Selecionadas
                </Badge>
              </div>
              <DialogDescription
                id="dialog-desc-multiplas-sessoes"
                className="text-xs text-muted-foreground"
              >
                {pacienteNome
                  ? `Análise longitudinal escalável de evolução clínica do paciente ${pacienteNome}.`
                  : "Análise quantitativa de deltas e trajetória entre múltiplas sessões clínicas finalizadas."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CENÁRIO 1: Sessões Insuficientes */}
        {sessoesOrdenadas.length < 2 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <Info className="h-10 w-10 text-muted-foreground/60" />
            <h4 className="font-semibold text-foreground text-sm">
              Seleção Insuficiente de Partidas
            </h4>
            <p className="text-xs max-w-md">
              Para efetuar a análise analítica multi-sessões, é necessário selecionar pelo
              menos 3 sessões clínicas no prontuário do paciente.
            </p>
            <Button
              variant="outline"
              onClick={onClose}
              className="mt-2 text-xs font-semibold min-h-11 min-w-11 px-6 rounded-xl cursor-pointer"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-2">
            {/* Alerta de Homogeneidade / Heterogeneidade (RN02) */}
            {!mesmoJogo ? (
              <div
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs"
                data-testid="alerta-jogos-heterogeneos"
              >
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold block text-sm">
                    Comparação Multi-Jogos ({jogosDistintos.length} jogos selecionados)
                  </strong>
                  <p className="leading-relaxed">
                    As sessões selecionadas abrangem jogos terapêuticos diferentes (
                    {jogosDistintos.map((j) => j.nome).join(", ")}). Conforme a arquitetura
                    clínica do InTEA (RN02), métricas universais de engajamento, foco, estresse e
                    tempo são consolidadas de modo transversal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Sessões homogêneas do mesmo jogo terapêutico (
                  <strong className="font-bold">{nomeJogoPrincipal}</strong>). Permite análise
                  direta de evolução fase a fase e latência motora.
                </span>
              </div>
            )}

            {/* Fita Horizontal Escalável de Sessões (Cards Horizontais com Scroll) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Linha do Tempo das Intervenções Selecionadas
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {intervaloTotalDias || "Sessões sequenciais"}
                </span>
              </div>

              <div
                className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin"
                data-testid="fita-sessoes-timeline"
              >
                {sessoesOrdenadas.map((s, index) => {
                  const ehBaseline = index === indiceBaseline;
                  const duracao = obterDuracao(s);

                  return (
                    <div
                      key={s.id}
                      className={`min-w-[210px] max-w-[230px] shrink-0 p-3 rounded-xl border transition-all flex flex-col justify-between text-xs ${
                        ehBaseline
                          ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                          : "bg-surface-alt/60 dark:bg-surface-highlight/40 border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              ehBaseline
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Ponto {index + 1}
                            {ehBaseline ? " (Base)" : ""}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{s.session_token || s.id.slice(0, 6)}
                          </span>
                        </div>

                        <div className="font-semibold text-foreground truncate" title={s.jogo?.nome}>
                          {s.jogo?.nome || s.jogo?.titulo || "Jogo Terapêutico"}
                        </div>

                        <div className="space-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary shrink-0" />
                            <span title={formatarDataHora(s.data_hora_inicio)}>
                              {formatarDataCurta(s.data_hora_inicio)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary shrink-0" />
                            <span>{formatarDuracao(duracao)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-primary shrink-0" />
                            <span>
                              Estresse: {s.contexto_dda_json?.estresse_inicial ?? "Padrão"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {s.terapeuta?.nome?.split(" ")[0] || "Terapeuta"}
                        </span>
                        {!ehBaseline && (
                          <button
                            type="button"
                            onClick={() => setIndiceBaseline(index)}
                            className="text-[10px] text-primary hover:underline cursor-pointer"
                            title="Definir esta sessão como referência para cálculo dos deltas"
                          >
                            Tornar Base
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matriz Comparativa Escalável (Tabela Horizontalmente Responsiva) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Matriz Comparativa de Métricas Clínicas
                </span>
                <span className="text-[11px] text-muted-foreground italic">
                  Deltas calculados em relação ao Ponto {indiceBaseline + 1} (
                  {formatarDataCurta(sessaoBaseReferencia.data_hora_inicio)})
                </span>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
                <Table className="min-w-[680px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="w-56 text-xs font-bold text-foreground">
                        Métrica Clínica
                      </TableHead>
                      {sessoesOrdenadas.map((s, index) => {
                        const ehBaseline = index === indiceBaseline;
                        return (
                          <TableHead
                            key={s.id}
                            className={`text-center text-xs font-bold ${
                              ehBaseline ? "text-primary bg-primary/5" : "text-foreground"
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>
                                P{index + 1}
                                {ehBaseline ? " (Base)" : ""}
                              </span>
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {formatarDataCurta(s.data_hora_inicio)}
                              </span>
                            </div>
                          </TableHead>
                        );
                      })}
                      <TableHead className="text-center text-xs font-bold text-foreground w-48">
                        Trajetória & Delta Final
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricasConfig.map((metrica) => {
                      // Coleta os valores de todas as sessões para esta métrica
                      const valoresPorSessao = sessoesOrdenadas.map((s) => metrica.extrairValor(s));
                      const valoresNumericos = valoresPorSessao.filter(
                        (v): v is number => typeof v === "number" && !Number.isNaN(v)
                      );

                      const valorBase = metrica.extrairValor(sessaoBaseReferencia);
                      const valorFinal = metrica.extrairValor(sessaoMaisRecente);

                      const deltaCalculado = calcularDeltaMetrica(
                        valorBase,
                        valorFinal,
                        metrica.polaridade
                      );

                      return (
                        <TableRow
                          key={metrica.id}
                          className="hover:bg-muted/20 border-b border-border/40"
                          data-testid={`linha-metrica-${metrica.id}`}
                        >
                          {/* Coluna Fixa: Métrica */}
                          <TableCell className="py-2.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-foreground">
                                {metrica.nome}
                              </span>
                              <span className="text-[10px] text-muted-foreground leading-tight">
                                {metrica.descricao}
                              </span>
                            </div>
                          </TableCell>

                          {/* Colunas Dinâmicas: Cada Sessão */}
                          {sessoesOrdenadas.map((s, index) => {
                            const val = metrica.extrairValor(s);
                            const ehBaseline = index === indiceBaseline;

                            return (
                              <TableCell
                                key={s.id}
                                className={`text-center py-2.5 text-xs font-medium font-mono ${
                                  ehBaseline ? "bg-primary/5 text-primary font-bold" : "text-foreground"
                                }`}
                              >
                                {metrica.formatarValor(val)}
                              </TableCell>
                            );
                          })}

                          {/* Coluna Final: Trajetória Visual e Delta */}
                          <TableCell className="text-center py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              {valoresNumericos.length >= 2 ? (
                                <SparklineTendencia
                                  data={valoresNumericos}
                                  width={56}
                                  height={18}
                                />
                              ) : null}
                              {renderBadgeDelta(deltaCalculado, metrica.polaridade)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Rodapé com Informações de Suporte e Botão Acessível (44x44px) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-[11px] text-muted-foreground">
                * Análise analítica multi-sessões em conformidade com o Art. 6º da Lei 13.787/2018 e
                invariante RN02.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="min-h-11 min-w-11 px-6 text-xs font-semibold rounded-xl cursor-pointer"
                  data-testid="botao-fechar-modal-multiplas"
                >
                  Fechar Comparativo
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ModalCompararMultiplasSessoes;
