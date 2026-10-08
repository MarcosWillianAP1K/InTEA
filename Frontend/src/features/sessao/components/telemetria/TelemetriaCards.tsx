import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { MetricasTelemetria } from "../../types";
import {
  CheckCircle2,
  XCircle,
  Timer,
  Zap,
  Eye,
  Activity,
  AlertCircle,
} from "lucide-react";

export interface TelemetriaCardsProps {
  metricas: MetricasTelemetria;
  isLoading?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE: TelemetriaCards (Front-end 2 — Luma Maiara / Card 4.1)
 * Requisitos: RF12, RF17, RN02
 * Exibe métricas em tempo real recebidas do dispositivo remoto
 * ============================================================================
 */

/**
 * Grid de cartões com indicadores e métricas clínicas recebidas em tempo real (RF12, RF17, RN02).
 * Exibe contagem de acertos/erros, precisão percentual, tempo médio de resposta, níveis de atenção e estresse.
 */
export function TelemetriaCards({ metricas, isLoading = false }: TelemetriaCardsProps) {
  const taxaAcerto =
    metricas.totalEventos > 0
      ? Math.round((metricas.acertos / (metricas.acertos + metricas.erros || 1)) * 100)
      : 0;

  if (metricas.totalEventos === 0 && !isLoading) {
    return (
      <Card
        data-testid="telemetria-empty-state"
        className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center"
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0b3294] dark:text-blue-400">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Aguardando telemetria em tempo real
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Os eventos de interação, acertos, erros e tempo de reação serão exibidos aqui assim que o paciente interagir com o jogo no tablet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      data-testid="telemetria-cards-grid"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Card 1: Acertos e Precisão */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs transition-all hover:shadow-md">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Acertos Clínicos</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              data-testid="card-acertos-valor"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {metricas.acertos}
            </span>
            <Badge
              variant="outline"
              className="text-2xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            >
              {taxaAcerto}% precisão
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Erros / Desvios */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs transition-all hover:shadow-md">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Erros / Ajustes</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              data-testid="card-erros-valor"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {metricas.erros}
            </span>
            {metricas.erros > 5 && (
              <Badge
                variant="outline"
                className="text-2xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                Intervenção
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Tempo Médio de Reação */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs transition-all hover:shadow-md">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tempo Médio de Reação</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0b3294] dark:text-blue-400">
              <Timer className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              data-testid="card-tempo-resposta-valor"
              className="text-2xl font-bold tracking-tight text-foreground font-mono"
            >
              {metricas.tempoMedioRespostaMs > 0
                ? `${(metricas.tempoMedioRespostaMs / 1000).toFixed(2)}s`
                : "--"}
            </span>
            <span className="text-2xs text-muted-foreground font-mono">
              {metricas.tempoMedioRespostaMs > 0 ? `${metricas.tempoMedioRespostaMs} ms` : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Engajamento & Foco */}
      <Card className="rounded-2xl border border-border bg-card shadow-xs transition-all hover:shadow-md">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Engajamento e Atenção</span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                data-testid="card-engajamento-valor"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                {metricas.nivelEngajamento}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Eye className="h-3 w-3 text-violet-500" />
              <span>Atenção: {metricas.nivelAtencao}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
