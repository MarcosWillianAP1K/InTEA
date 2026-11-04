"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
} from "lucide-react";
import type { Sessao } from "@/features/sessao/types/sessao.types";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export type PolaridadeClinica = "maior_melhor" | "menor_melhor";

export type StatusEvolucaoClinica =
  | "melhora"
  | "regressao"
  | "estavel"
  | "indeterminado";

export interface MetricaComparadaItem {
  id: string;
  nome: string;
  descricao?: string;
  unidade: string;
  valorA: number | null | undefined;
  valorB: number | null | undefined;
  polaridade: PolaridadeClinica;
}

export interface ResultadoCalculoDelta {
  deltaAbsoluto: number | null;
  deltaPercentual: number | null;
  textoFormatado: string;
  statusClinico: StatusEvolucaoClinica;
}

type SessaoComMetricasConsolidadas = Sessao & {
  metricas_consolidadas?: {
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
 * Computes safe absolute and percentage variation deltas between clinical session metrics.
 * Mathematical Precision: Rigorously handles division by zero (base === 0) and null or missing values.
 *
 * @param base - Numeric value of the reference baseline session (Session A)
 * @param comparado - Numeric value of the compared session (Session B)
 * @param polaridade - Clinical goal polarity where 'maior_melhor' or 'menor_melhor'
 * @returns Calculated delta object with absolute delta, percentage delta, formatted text, and clinical status
 */
export function calcularDeltaMetrica(
  base: number | null | undefined,
  comparado: number | null | undefined,
  polaridade: PolaridadeClinica
): ResultadoCalculoDelta {
  if (
    base === null ||
    base === undefined ||
    comparado === null ||
    comparado === undefined ||
    Number.isNaN(base) ||
    Number.isNaN(comparado)
  ) {
    return {
      deltaAbsoluto: null,
      deltaPercentual: null,
      textoFormatado: "N/D",
      statusClinico: "indeterminado",
    };
  }

  const deltaAbsoluto = comparado - base;

  if (deltaAbsoluto === 0) {
    return {
      deltaAbsoluto: 0,
      deltaPercentual: 0,
      textoFormatado: "0.0%",
      statusClinico: "estavel",
    };
  }

  let deltaPercentual: number | null = null;
  let textoFormatado = "";

  // Tratamento explícito de divisão por zero
  if (base === 0) {
    deltaPercentual = 100;
    textoFormatado = deltaAbsoluto > 0 ? `+${deltaAbsoluto}` : `${deltaAbsoluto}`;
  } else {
    deltaPercentual = ((comparado - base) / Math.abs(base)) * 100;
    const sinal = deltaPercentual > 0 ? "+" : "";
    textoFormatado = `${sinal}${deltaPercentual.toFixed(1)}%`;
  }

  // Polaridade Clínica:
  // - "maior_melhor": aumento (delta > 0) é melhora; redução (delta < 0) é regressão
  // - "menor_melhor": redução (delta < 0) é melhora; aumento (delta > 0) é regressão
  const isMelhora =
    (polaridade === "maior_melhor" && deltaAbsoluto > 0) ||
    (polaridade === "menor_melhor" && deltaAbsoluto < 0);

  return {
    deltaAbsoluto,
    deltaPercentual,
    textoFormatado,
    statusClinico: isMelhora ? "melhora" : "regressao",
  };
}

export interface TabelaComparativaMetricasProps {
  sessaoA?: Sessao | null;
  sessaoB?: Sessao | null;
  metricasCustomizadas?: MetricaComparadaItem[];
  loading?: boolean;
  labelA?: string;
  labelB?: string;
}

/**
 * Renders comparative metric progression table between distinct clinical sessions (RF15, RN02).
 * Longitudinal Analysis: Highlights improvement, stabilization, or regression across therapeutic metrics.
 *
 * @param props - Component properties including session data and metrics
 * @returns Comparison table component
 */
export function TabelaComparativaMetricas({
  sessaoA,
  sessaoB,
  metricasCustomizadas,
  loading = false,
  labelA = "Sessão A (Baseline)",
  labelB = "Sessão B (Recente)",
}: TabelaComparativaMetricasProps) {
  // Extrai automaticamente métricas consolidadas canônicas se não forem passadas customizadas
  const listaMetricas = useMemo<MetricaComparadaItem[]>(() => {
    if (metricasCustomizadas && metricasCustomizadas.length > 0) {
      return metricasCustomizadas;
    }

    const consA = (sessaoA as SessaoComMetricasConsolidadas | null | undefined)
      ?.metricas_consolidadas;
    const consB = (sessaoB as SessaoComMetricasConsolidadas | null | undefined)
      ?.metricas_consolidadas;
    const ddaA = sessaoA?.contexto_dda_json;
    const ddaB = sessaoB?.contexto_dda_json;

    return [
      {
        id: "taxa_conclusao",
        nome: "Taxa de Conclusão",
        descricao: "Percentual do circuito ou objetivo terapêutico concluído",
        unidade: "%",
        valorA: consA?.taxa_conclusao ?? null,
        valorB: consB?.taxa_conclusao ?? null,
        polaridade: "maior_melhor",
      },
      {
        id: "estabilidade_foco",
        nome: "Estabilidade de Foco",
        descricao: "Manutenção de atenção sustentada sem desvio de olhar/toque",
        unidade: "%",
        valorA: consA?.estabilidade_foco ?? null,
        valorB: consB?.estabilidade_foco ?? null,
        polaridade: "maior_melhor",
      },
      {
        id: "tempo_medio_resposta_ms",
        nome: "Tempo Médio de Reação",
        descricao: "Latência média entre o estímulo sonoro/visual e a resposta do paciente",
        unidade: "ms",
        valorA: consA?.tempo_medio_resposta_ms ?? null,
        valorB: consB?.tempo_medio_resposta_ms ?? null,
        polaridade: "menor_melhor",
      },
      {
        id: "pontuacao_geral",
        nome: "Pontuação Geral",
        descricao: "Escore lúdico consolidado alcançado na fase",
        unidade: "pts",
        valorA: consA?.pontuacao_geral ?? null,
        valorB: consB?.pontuacao_geral ?? null,
        polaridade: "maior_melhor",
      },
      {
        id: "total_acertos",
        nome: "Total de Acertos",
        descricao: "Respostas corretas sem auxílio direto",
        unidade: "acertos",
        valorA: consA?.total_acertos ?? null,
        valorB: consB?.total_acertos ?? null,
        polaridade: "maior_melhor",
      },
      {
        id: "total_erros",
        nome: "Total de Erros / Frustração",
        descricao: "Falhas de seleção e toques repetidos em alvos incorretos",
        unidade: "erros",
        valorA: consA?.total_erros ?? null,
        valorB: consB?.total_erros ?? null,
        polaridade: "menor_melhor",
      },
      {
        id: "intervencoes_dda",
        nome: "Intervenções do Motor DDA",
        descricao: "Quantitativo de reajustes automáticos de dificuldade",
        unidade: "ações",
        valorA: consA?.intervencoes_dda ?? null,
        valorB: consB?.intervencoes_dda ?? null,
        polaridade: "menor_melhor",
      },
      {
        id: "estresse_inicial",
        nome: "Nível de Estresse Inicial",
        descricao: "Escala clínica pré-sessão de ansiedade/agitação (1 a 5)",
        unidade: "/5",
        valorA: ddaA?.estresse_inicial ?? null,
        valorB: ddaB?.estresse_inicial ?? null,
        polaridade: "menor_melhor",
      },
    ];
  }, [sessaoA, sessaoB, metricasCustomizadas]);

  const renderBadgeDelta = (calculo: ResultadoCalculoDelta, polaridade: PolaridadeClinica) => {
    switch (calculo.statusClinico) {
      case "melhora":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
            data-testid={`badge-delta-melhora`}
          >
            {polaridade === "menor_melhor" ? (
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{calculo.textoFormatado}</span>
          </span>
        );
      case "regressao":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs"
            data-testid={`badge-delta-regressao`}
          >
            {polaridade === "menor_melhor" ? (
              <TrendingUp className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{calculo.textoFormatado}</span>
          </span>
        );
      case "estavel":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border shadow-2xs"
            data-testid={`badge-delta-estavel`}
          >
            <Minus className="h-3 w-3" />
            <span>0.0%</span>
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground"
            data-testid={`badge-delta-indeterminado`}
          >
            <HelpCircle className="h-3 w-3" />
            <span>N/D</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
            <TableHead className="text-xs font-bold text-foreground w-1/3">
              Métrica Clínica
            </TableHead>
            <TableHead className="text-xs font-bold text-foreground text-center">
              {labelA}
            </TableHead>
            <TableHead className="text-xs font-bold text-foreground text-center">
              {labelB}
            </TableHead>
            <TableHead className="text-xs font-bold text-foreground text-center">
              Delta Absoluto
            </TableHead>
            <TableHead className="text-right text-xs font-bold text-foreground pr-6">
              Evolução Relativa
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            // Skeleton Loaders estruturais prevenindo Cumulative Layout Shift (CLS)
            Array.from({ length: 6 }).map((_, idx) => (
              <TableRow key={`skeleton-row-${idx}`} className="border-b border-border/60">
                <TableCell className="py-4">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-64 rounded" />
                  </div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <Skeleton className="h-5 w-16 mx-auto rounded" />
                </TableCell>
                <TableCell className="py-4 text-center">
                  <Skeleton className="h-5 w-16 mx-auto rounded" />
                </TableCell>
                <TableCell className="py-4 text-center">
                  <Skeleton className="h-5 w-20 mx-auto rounded" />
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                  <Skeleton className="h-6 w-24 ml-auto rounded-full" />
                </TableCell>
              </TableRow>
            ))
          ) : (
            listaMetricas.map((item) => {
              const calculo = calcularDeltaMetrica(
                item.valorA,
                item.valorB,
                item.polaridade
              );

              return (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/20 border-b border-border/60 transition-colors"
                  data-testid={`row-metrica-${item.id}`}
                >
                  {/* Nome da Métrica e Descrição */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-foreground">
                        {item.nome}
                      </span>
                      {item.descricao && (
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {item.descricao}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Valor Sessão A (Baseline) */}
                  <TableCell className="py-3.5 text-center text-xs font-mono font-medium text-foreground">
                    {item.valorA !== null && item.valorA !== undefined
                      ? `${item.valorA} ${item.unidade}`
                      : "—"}
                  </TableCell>

                  {/* Valor Sessão B (Recente) */}
                  <TableCell className="py-3.5 text-center text-xs font-mono font-medium text-foreground">
                    {item.valorB !== null && item.valorB !== undefined
                      ? `${item.valorB} ${item.unidade}`
                      : "—"}
                  </TableCell>

                  {/* Delta Absoluto */}
                  <TableCell className="py-3.5 text-center text-xs font-mono font-semibold text-foreground">
                    {calculo.deltaAbsoluto !== null ? (
                      <span>
                        {calculo.deltaAbsoluto > 0 ? `+${calculo.deltaAbsoluto}` : calculo.deltaAbsoluto}{" "}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {item.unidade}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Variação Relativa & Polaridade Clínica */}
                  <TableCell className="py-3.5 text-right pr-6">
                    {renderBadgeDelta(calculo, item.polaridade)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default TabelaComparativaMetricas;
