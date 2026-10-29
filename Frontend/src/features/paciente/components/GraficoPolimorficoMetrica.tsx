import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AlertTriangle, AlertCircle, FileX } from "lucide-react";
import type { SerieMetricaJogo } from "../types/historico.types";
import { GraficoLinhaTemporal } from "./GraficoLinhaTemporal";
import { GraficoBarrasCategorico } from "./GraficoBarrasCategorico";
import { IndicadorBooleanoMetrica } from "./IndicadorBooleanoMetrica";

export interface GraficoPolimorficoMetricaProps {
  serie: SerieMetricaJogo;
  titulo?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * ============================================================================
 * COMPONENTE RENDERIZADOR POLIMÓRFICO DE MÉTRICAS (InTEA)
 * Conformidade: RF15 (Prontuário Longitudinal), RN02 (Tipagem Estrita no Manifesto),
 * RNF04 (Feedback e Ergonomia), RNF07 (Acessibilidade)
 * ============================================================================
 */
/**
 * Polymorphic telemetry metric visualization chart dynamically adapting to metric data types (RF15, RN02).
 * Manifest-Driven Rendering (RN02): Renders continuous line plots or discrete step charts according to metric type.
 *
 * @param props - Component properties with series data, unit labels, and metric definitions
 * @returns Polymorphic metric chart component
 */
export function GraficoPolimorficoMetrica({
  serie,
  titulo,
  isLoading = false,
  className = "",
}: GraficoPolimorficoMetricaProps) {
  // 1. Loading State (Skeleton Loader Estrutural - Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="grafico-polimorfico-skeleton"
        className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4 h-72 ${className}`}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex-1 w-full flex items-end pt-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>
    );
  }

  if (!serie) {
    return (
      <Card
        data-testid="grafico-polimorfico-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/15 p-6 text-center flex flex-col items-center justify-center gap-2 h-72 ${className}`}
      >
        <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
          <div className="p-2.5 rounded-full bg-muted text-muted-foreground">
            <FileX className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Nenhum Dado Registrado para Esta Métrica
          </h4>
        </CardContent>
      </Card>
    );
  }

  // 3. Empty State (Série válida com tipo homologado mas sem pontos)
  if (!serie.pontos || serie.pontos.length === 0) {
    return (
      <Card
        data-testid="grafico-polimorfico-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/15 p-6 text-center flex flex-col items-center justify-center gap-2 h-72 ${className}`}
      >
        <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
          <div className="p-2.5 rounded-full bg-muted text-muted-foreground">
            <FileX className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Nenhum Dado Registrado para Esta Métrica
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            A métrica &ldquo;{serie.nome_metrica || serie.id_metrica || "desconhecida"}&rdquo; não possui eventos clínicos ou pontos temporais registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 2. GARANTIA INVIOLÁVEL DA REGRA CLÍNICA RN02 (Rejeição de Fallback Automático)
  // Toda métrica DEVE ter tipo_metrica explicitamente homologado no manifesto.
  const tipo = serie.tipo_metrica?.trim()?.toLowerCase();

  const isNumerica = tipo === "numerica";
  const isCategorica = tipo === "categorica";
  const isOrdinal = tipo === "ordinal";
  const isBooleana = tipo === "booleana";

  const isTipoValido = isNumerica || isCategorica || isOrdinal || isBooleana;

  if (!isTipoValido) {
    return (
      <Card
        data-testid="error-state-rn02"
        className={`rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6 shadow-xs flex flex-col justify-between gap-4 h-72 ${className}`}
      >
        <CardHeader className="p-0 flex flex-row items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                Inconsistência de Tipagem Clínica
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Métrica: <strong className="text-foreground">{serie.nome_metrica || serie.id_metrica}</strong>
              </p>
            </div>
          </div>
          <Badge
            data-testid="badge-alerta-rn02"
            variant="destructive"
            className="text-2xs font-semibold px-2.5 py-0.5 rounded-full shrink-0"
          >
            Tipo Incompatível
          </Badge>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col justify-center">
          <div className="p-3.5 rounded-xl bg-background/80 border border-destructive/20 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Bloqueio de Fallback Automático Mandatório</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              O manifesto do jogo declarou um <code>tipo_metrica</code> ausente ou inválido (
              <span className="font-mono text-destructive font-bold">
                &ldquo;{serie.tipo_metrica || "vazio/indefinido"}&rdquo;
              </span>
              ). É terminantemente proibido converter métricas heterogêneas ou sem tipagem estrita por fallback automático para
              preservar a integridade diagnóstica do prontuário do paciente.
            </p>
          </div>
        </CardContent>

        <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1 border-t border-destructive/10">
          <span>Identificador: <code>{serie.id_metrica}</code></span>
          <span>Tipos aceitos: <code>numerica</code>, <code>categorica</code>, <code>ordinal</code>, <code>booleana</code></span>
        </div>
      </Card>
    );
  }

  // 4. Renderização Polimórfica Conforme Tipagem Estrita Homologada
  if (isNumerica) {
    return (
      <GraficoLinhaTemporal
        serie={serie}
        titulo={titulo}
        className={className}
      />
    );
  }

  if (isCategorica || isOrdinal) {
    return (
      <GraficoBarrasCategorico
        serie={serie}
        titulo={titulo}
        className={className}
      />
    );
  }

  if (isBooleana) {
    return (
      <IndicadorBooleanoMetrica
        serie={serie}
        titulo={titulo}
        className={className}
      />
    );
  }

  return null;
}
