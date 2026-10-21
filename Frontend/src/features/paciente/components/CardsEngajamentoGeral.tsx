
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Timer,
  Activity,
  Layers,
} from "lucide-react";
import type { MetricasEngajamentoGeral } from "../types/historico.types";

export interface CardsEngajamentoGeralProps {
  engajamento?: MetricasEngajamentoGeral | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Converte segundos para formato humanizado e legível clinicamente (ex: "4h 30m" ou "22m 30s").
 */
export function formatarTempoSegundos(totalSegundos: number): string {
  if (!totalSegundos || totalSegundos <= 0) return "0 min";

  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = Math.floor(totalSegundos % 60);

  if (horas > 0) {
    return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
  }
  if (minutos > 0) {
    return segundos > 0 ? `${minutos}m ${segundos}s` : `${minutos} min`;
  }
  return `${segundos}s`;
}

/**
 * ============================================================================
 * COMPONENTE CARDS DE ENGAJAMENTO GERAL (InTEA)
 * Conformidade: RF15 (Prontuário Longitudinal), RN01 (Expurgo Modo Livre),
 * RNF04 (Feedback e Ergonomia), RNF07 (Acessibilidade)
 * ============================================================================
 */
export function CardsEngajamentoGeral({
  engajamento,
  isLoading = false,
  className = "",
}: CardsEngajamentoGeralProps) {
  // 1. Loading State (Skeleton Loaders Estruturais - Zero Layout Shift)
  if (isLoading) {
    return (
      <div
        data-testid="cards-engajamento-skeleton"
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      >
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={`skeleton-card-${i}`}
            className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between h-36"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="space-y-2 mt-2">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-3.5 w-36 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // 2. Empty State (Sem sessões ou dados insuficientes)
  const totalSessoes =
    engajamento?.total_sessoes ?? engajamento?.total_iniciadas ?? 0;

  if (!engajamento || totalSessoes === 0) {
    return (
      <Card
        data-testid="cards-engajamento-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center ${className}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Nenhuma Sessão Clínica Registrada
            </h4>
            <p className="text-xs text-muted-foreground max-w-md">
              O paciente ainda não possui histórico de sessões com jogos terapêuticos.
              Inicie um atendimento na Biblioteca de Jogos para registrar telemetria e métricas de engajamento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Success State (Dados de engajamento consolidados)
  const taxaConclusao =
    engajamento.taxa_conclusao_porcentagem ?? engajamento.taxa_conclusao ?? 0;
  const isAderenciaBoa = taxaConclusao >= 80;

  return (
    <div
      data-testid="cards-engajamento-geral"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {/* CARD 1: TAXA DE CONCLUSÃO / ADERÊNCIA */}
      <Card
        data-testid="card-taxa-conclusao"
        className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
      >
        <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Taxa de Conclusão
          </CardTitle>
          <div
            className={`p-2 rounded-xl ${
              isAderenciaBoa
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
            }`}
          >
            <Activity className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-1">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="valor-taxa-conclusao"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {taxaConclusao.toFixed(1)}%
            </span>
            <Badge
              data-testid="badge-aderencia"
              variant="outline"
              className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                isAderenciaBoa
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
              }`}
            >
              {isAderenciaBoa ? "Boa Aderência (≥80%)" : "Atenção (<80%)"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 inline shrink-0" />
            <span>
              {engajamento.sessoes_finalizadas} de {engajamento.total_iniciadas || totalSessoes} sessões finalizadas
            </span>
          </p>
        </CardContent>
      </Card>

      {/* CARD 2: TEMPO TOTAL DE ENGAJAMENTO */}
      <Card
        data-testid="card-tempo-total"
        className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
      >
        <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tempo Total Ativo
          </CardTitle>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-1">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="valor-tempo-total"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {formatarTempoSegundos(engajamento.tempo_total_segundos)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tempo acumulado jogando em sessões clínicas
          </p>
        </CardContent>
      </Card>

      {/* CARD 3: TEMPO MÉDIO POR SESSÃO */}
      <Card
        data-testid="card-tempo-medio"
        className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
      >
        <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tempo Médio / Sessão
          </CardTitle>
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Timer className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-1">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="valor-tempo-medio"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {formatarTempoSegundos(engajamento.tempo_medio_segundos)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Permanência média por intervenção clínica
          </p>
        </CardContent>
      </Card>

      {/* CARD 4: DESFECHO DAS SESSÕES (FINALIZADAS VS INTERROMPIDAS) */}
      <Card
        data-testid="card-desfechos"
        className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
      >
        <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Desfecho das Sessões
          </CardTitle>
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Layers className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-1">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="valor-desfechos"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {engajamento.sessoes_finalizadas}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {totalSessoes}
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3 inline" /> {engajamento.sessoes_finalizadas} concluídas
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-3 w-3 inline" /> {engajamento.sessoes_interrompidas} interrupções
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
