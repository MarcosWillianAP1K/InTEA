import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { DadosIaRelatorio, TendenciaMetrica } from "../../types";
import {
  Sparkles,
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  CheckCircle2,
  Info,
} from "lucide-react";

export interface PainelInsightsIAProps {
  dadosIa?: DadosIaRelatorio | null;
  isLoading?: boolean;
  isModoLivre?: boolean;
  className?: string;
}

/**
 * Utilitário de formatação de identificador de métrica snake_case -> Nome Legível.
 */
export function formatarNomeMetrica(id: string): string {
  if (!id) return "";
  return id
    .split("_")
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(" ");
}

/**
 * ============================================================================
 * COMPONENTE: PainelInsightsIA (Front-end 2 — Luma Maiara / Card 4.3)
 * Requisitos: RF14, RNF02, RN01
 * Referência: Contrato 4 (docs/ModelosDeContratos/relatorio.json), Figura 12
 * 
 * Componente puro orientado a props para exibição da síntese analítica do motor de IA:
 * 1. Observações contextuais do paciente pós-sessão (analises_ia[])
 * 2. Tendências e valores dominantes de métricas agregadas (estável, crescente, decrescente)
 * 3. Alertas clínicos em destaque para modulação de estímulos sensoriais
 * 4. Recomendações adaptativas para as próximas sessões
 * 5. Skeleton loader geométrico (zero CLS) e tratamento rigoroso para Modo Livre (RN01)
 * ============================================================================
 */
export function PainelInsightsIA({
  dadosIa,
  isLoading = false,
  isModoLivre = false,
  className = "",
}: PainelInsightsIAProps) {
  // 1. Loading State (Skeleton Loader Geométrico - Zero CLS)
  if (isLoading) {
    return (
      <Card
        data-testid="painel-insights-ia-skeleton"
        className={`rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 h-[380px] ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-56 rounded-md" />
            <Skeleton className="h-3 w-80 rounded-md" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-6 w-32 rounded-md" />
        </div>
      </Card>
    );
  }

  // 2. Empty State / Modo Livre (RN01 - Sem IA / DDA)
  if (isModoLivre) {
    return (
      <Card
        data-testid="painel-insights-ia-modo-livre"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center ${className}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Brain className="h-6 w-6 opacity-75" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground">
                Síntese de IA Desativada em Modo Livre
              </h4>
              <Badge
                variant="outline"
                className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              >
                RN01
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Partidas executadas em Modo Livre não associam prontuário de paciente e não acionam o motor contextual de DDA ou geração de relatórios clínicos analíticos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Empty State quando não houver dados de IA
  const temAnalises = Boolean(dadosIa?.analises_ia && dadosIa.analises_ia.length > 0);
  const temMetricasAgregadas = Boolean(
    dadosIa?.metricas_agregadas && dadosIa.metricas_agregadas.length > 0
  );

  if (!dadosIa || (!temAnalises && !temMetricasAgregadas)) {
    return (
      <Card
        data-testid="painel-insights-ia-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center ${className}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0b3294] dark:text-blue-400">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Nenhum Parecer de IA Registrado
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              O motor contextual de inteligência artificial não gerou observações analíticas para esta sessão.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper para verificar se há recomendação de redução sensorial
  const analises = dadosIa.analises_ia ?? [];
  const possuiAlertaSensorial =
    dadosIa.alerta_sensorial ||
    analises.some((a) =>
      /redução.*estímulo|sensorial|som_agudo|luz_piscante|estímulos sonoros|frustração alta/i.test(
        a
      )
    );

  // Helper para renderizar badge de tendência
  const getBadgeTendencia = (tendencia: TendenciaMetrica) => {
    switch (tendencia) {
      case "crescente":
        return {
          label: "Crescente",
          icon: <TrendingUp className="h-3 w-3" />,
          className:
            "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "decrescente":
        return {
          label: "Decrescente",
          icon: <TrendingDown className="h-3 w-3" />,
          className:
            "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "estavel":
      default:
        return {
          label: "Estável",
          icon: <Minus className="h-3 w-3" />,
          className:
            "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
    }
  };

  return (
    <Card
      data-testid="painel-insights-ia-container"
      className={`rounded-2xl border border-border bg-card shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${className}`}
    >
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Síntese Analítica do Agente de IA
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Pareceres contextuais e tendências gerados conforme o Contrato 4 do Ecossistema InTEA
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className="w-fit text-2xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center gap-1"
          >
            <Brain className="h-3 w-3" />
            Motor DDA Ativo
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 flex-1 flex flex-col gap-4">
        {/* 1. Alerta em Destaque: Modulação Sensorial */}
        {possuiAlertaSensorial && (
          <div
            data-testid="alerta-sensorial-ia"
            className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-3 transition-all"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Atenção Clínica: Modulação Sensorial Recomendada
              </h5>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                O motor analítico identificou necessidade de atenuação de estímulos sonoros e visuais durante os momentos de maior exigência atencional do paciente.
              </p>
            </div>
          </div>
        )}

        {/* 2. Lista de Análises Contextuais (analises_ia[]) */}
        {temAnalises && (
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Observações Clínicas Contextuais
            </span>

            <div className="space-y-2">
              {analises.map((observacao, idx) => (
                <div
                  key={`analise-ia-${idx}`}
                  data-testid={`item-analise-ia-${idx}`}
                  className="p-3 rounded-xl bg-accent/40 border border-border/80 flex items-start gap-3 transition-all hover:bg-accent/60"
                >
                  <div className="mt-0.5 p-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {observacao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Métricas Agregadas e Tendências (metricas_agregadas[]) */}
        {temMetricasAgregadas && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Métricas Consolidadas e Tendência Clínica
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dadosIa.metricas_agregadas!.map((metrica, idx) => {
                const badge = getBadgeTendencia(metrica.tendencia);
                return (
                  <div
                    key={`metrica-agregada-${idx}`}
                    data-testid={`metrica-agregada-${metrica.id_metrica}`}
                    className="p-3 rounded-xl border border-border bg-card/60 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {formatarNomeMetrica(metrica.id_metrica)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-2xs font-semibold flex items-center gap-1 shrink-0 ${badge.className}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xs text-muted-foreground">
                        Valor Dominante:
                      </span>
                      <strong className="text-xs font-bold text-foreground capitalize">
                        {metrica.valor_dominante}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Sugestões Adaptativas para as Próximas Sessões */}
        {dadosIa.recomendacoes_adaptativas && dadosIa.recomendacoes_adaptativas.length > 0 && (
          <div
            data-testid="bloco-recomendacoes-adaptativas"
            className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3"
          >
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-[#0b3294] dark:text-blue-300 shrink-0">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="space-y-1 w-full">
              <h5 className="text-xs font-bold text-foreground">
                Sugestões Adaptativas para o Planejamento
              </h5>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {dadosIa.recomendacoes_adaptativas.map((rec, i) => (
                  <li key={`rec-${i}`}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
