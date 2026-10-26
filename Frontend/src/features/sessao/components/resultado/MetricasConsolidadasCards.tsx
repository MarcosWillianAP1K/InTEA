import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { MetricasConsolidadasDados } from "../../types";
import {
  Timer,
  Target,
  Sliders,
  Trophy,
  Zap,
  Activity,
} from "lucide-react";

export interface MetricasConsolidadasCardsProps {
  metricas?: MetricasConsolidadasDados | null;
  isLoading?: boolean;
  isModoLivre?: boolean;
  className?: string;
}

/**
 * Clinical duration formatting utility (seconds -> readable string).
 */
export function formatarDuracaoClinica(segundos: number): string {
  if (!segundos || segundos <= 0) return "00m 00s";
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segsRestantes = Math.floor(segundos % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (horas > 0) {
    return `${horas}h ${pad(minutos)}m ${pad(segsRestantes)}s`;
  }
  return `${pad(minutos)}m ${pad(segsRestantes)}s`;
}


export function MetricasConsolidadasCards({
  metricas,
  isLoading = false,
  isModoLivre = false,
  className = "",
}: MetricasConsolidadasCardsProps) {
  // 1. Loading State (Skeleton Loaders Geométricos - Zero Cumulative Layout Shift)
  if (isLoading) {
    return (
      <div
        data-testid="metricas-consolidadas-skeleton"
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 ${className}`}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Card
            key={`skeleton-card-${index}`}
            className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-3 h-33"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // 2. Empty State (Caso métricas estejam nulas ou vazias)
  if (!metricas) {
    return (
      <Card
        data-testid="metricas-consolidadas-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center ${className}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Métricas Consolidadas Não Disponíveis
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Não foram encontrados dados analíticos consolidados para esta sessão ou a partida ainda não foi concluída.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper para Taxa de Conclusão e badge clínico
  const taxaConclusaoValor = Number(metricas.taxaConclusao ?? 0);
  const getBadgeConclusao = (taxa: number) => {
    if (taxa >= 80) {
      return {
        label: "Excelente",
        variant: "outline" as const,
        className:
          "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    }
    if (taxa >= 50) {
      return {
        label: "Satisfatório",
        variant: "outline" as const,
        className:
          "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    }
    return {
      label: "Abaixo do Esperado",
      variant: "outline" as const,
      className:
        "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    };
  };

  const badgeConclusao = getBadgeConclusao(taxaConclusaoValor);

  // Helper para Estabilidade de Foco
  const focoValor = metricas.estabilidadeFoco != null ? Number(metricas.estabilidadeFoco) : null;
  const getBadgeFoco = (foco: number | null) => {
    if (foco == null) {
      return {
        label: "Não Avaliado",
        className:
          "bg-muted/50 text-muted-foreground border-border",
      };
    }
    if (foco >= 80) {
      return {
        label: "Foco Alto",
        className:
          "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    }
    if (foco >= 60) {
      return {
        label: "Moderado",
        className:
          "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    }
    return {
      label: "Oscilante",
      className:
        "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    };
  };

  const badgeFoco = getBadgeFoco(focoValor);

  return (
    <div
      data-testid="metricas-consolidadas-grid"
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 ${className}`}
    >
      {/* CARD 1: Tempo Total de Atividade */}
      <Card
        data-testid="card-tempo-total"
        className="rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 hover:shadow-md"
      >
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tempo Total</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Timer className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              data-testid="card-tempo-total-valor"
              className="text-2xl font-bold tracking-tight text-foreground font-mono"
            >
              {formatarDuracaoClinica(metricas.duracaoSegundos)}
            </span>
            <Badge
              variant="outline"
              className="text-2xs font-medium bg-muted/40 text-muted-foreground border-border shrink-0"
            >
              {isModoLivre ? "Treino Livre" : "Sessão Clínica"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Taxa de Conclusão */}
      <Card
        data-testid="card-taxa-conclusao"
        className="rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 hover:shadow-md"
      >
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Taxa de Conclusão</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              data-testid="card-taxa-conclusao-valor"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {Number(taxaConclusaoValor.toFixed(1))}%
            </span>
            <Badge
              variant="outline"
              className={`text-2xs font-semibold shrink-0 ${badgeConclusao.className}`}
            >
              {badgeConclusao.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Intervenções DDA (Respeitando RN01 - Modo Livre) */}
      <Card
        data-testid="card-intervencoes-dda"
        className="rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 hover:shadow-md"
      >
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Intervenções DDA</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              data-testid="card-intervencoes-dda-valor"
              className="text-2xl font-bold tracking-tight text-foreground font-mono"
            >
              {isModoLivre ? "--" : metricas.intervencoesDda}
            </span>
            {isModoLivre ? (
              <Badge
                variant="outline"
                className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0"
              >
                Inativo (RN01)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-2xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shrink-0"
              >
                {metricas.intervencoesDda === 0 ? "Sem ajustes" : `${metricas.intervencoesDda} ajustes`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: Pontuação Geral */}
      <Card
        data-testid="card-pontuacao-geral"
        className="rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 hover:shadow-md"
      >
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pontuação Geral</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              data-testid="card-pontuacao-geral-valor"
              className="text-2xl font-bold tracking-tight text-foreground font-mono"
            >
              {metricas.pontuacaoGeral != null
                ? metricas.pontuacaoGeral.toLocaleString("pt-BR")
                : "--"}
            </span>
            {metricas.pontuacaoGeral != null ? (
              <Badge
                variant="outline"
                className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shrink-0"
              >
                Score Jogo
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-2xs font-medium bg-muted/50 text-muted-foreground border-border shrink-0"
              >
                Não Aplicável
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD 5: Estabilidade de Foco / Atenção */}
      <Card
        data-testid="card-estabilidade-foco"
        className="rounded-2xl border border-border bg-card shadow-xs transition-all duration-200 hover:shadow-md"
      >
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Estabilidade de Foco</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              data-testid="card-estabilidade-foco-valor"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {focoValor != null ? `${Math.round(focoValor)}%` : "--"}
            </span>
            <Badge
              variant="outline"
              className={`text-2xs font-semibold shrink-0 ${badgeFoco.className}`}
            >
              {badgeFoco.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
