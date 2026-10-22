import * as React from "react";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Gamepad2,
  Layers,
  Calendar,
} from "lucide-react";
import type { HistoricoJogoDetalhado } from "../types/historico.types";
import { GraficoPolimorficoMetrica } from "./GraficoPolimorficoMetrica";

export interface GraficoEvolucaoJogoProps {
  historicoJogo?: HistoricoJogoDetalhado | null;
  isLoading?: boolean;
  nomeJogo?: string;
  className?: string;
}

const MAPA_NOMES_METRICAS: Record<string, string> = {
  tempo_resposta: "Tempo de Resposta",
  tempo_reacao: "Tempo de Reação",
  precisao: "Precisão de Acertos",
  taxa_acerto: "Taxa de Acerto",
  acertos: "Total de Acertos",
  erros: "Total de Erros",
  estabilidade_emocional: "Estabilidade Emocional",
  estabilidade_foco: "Estabilidade de Foco",
  nivel_frustracao: "Nível de Frustração",
  tolerancia_frustracao: "Tolerância à Frustração",
  latencia_foco_ms: "Latência de Foco",
  engajamento: "Nível de Engajamento",
};

function formatarNomeMetricaLegivel(idOuNome?: string): string {
  if (!idOuNome) return "Métrica";
  const chave = idOuNome.trim().toLowerCase();
  if (MAPA_NOMES_METRICAS[chave]) {
    return MAPA_NOMES_METRICAS[chave];
  }
  if (!idOuNome.includes("_")) return idOuNome;
  return idOuNome
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * ============================================================================
 * CONTAINER DE EVOLUÇÃO DAS MÉTRICAS DO JOGO (InTEA)
 * Conformidade: RF15 (Prontuário Longitudinal), RN01 (Expurgo Modo Livre),
 * RN02 (Tipagem Estrita), RNF04 (Zero CLS), RNF07 (Acessibilidade)
 * ============================================================================
 */
export function GraficoEvolucaoJogo({
  historicoJogo,
  isLoading = false,
  nomeJogo,
  className = "",
}: GraficoEvolucaoJogoProps) {
  const [metricaSelecionadaId, setMetricaSelecionadaId] = React.useState<string>("todas");

  // 1. Loading State (Skeleton Loader Estrutural - Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="grafico-evolucao-skeleton"
        className={`space-y-4 ${className}`}
      >
        <Card className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56 rounded-md" />
              <Skeleton className="h-4 w-80 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // 2. Empty State (Jogo sem sessões clínicas registradas)
  const sessoesRegistradas = historicoJogo?.sessoes?.length ?? 0;
  const seriesDisponiveis = historicoJogo?.series_temporais ?? [];
  const tituloJogo = historicoJogo?.jogo?.nome || nomeJogo || "Jogo Selecionado";

  if (!historicoJogo || (sessoesRegistradas === 0 && seriesDisponiveis.length === 0)) {
    return (
      <Card
        data-testid="grafico-evolucao-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/15 p-8 text-center ${className}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3.5 rounded-full bg-primary/10 text-primary">
            <Gamepad2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-foreground">
              Sem Sessões com &ldquo;{tituloJogo}&rdquo;
            </h4>
            <p className="text-xs text-muted-foreground max-w-md">
              O paciente ainda não possui sessões clínicas registradas para este jogo terapêutico.
              Inicie um atendimento direcionado para coletar métricas e traçar o histórico evolutivo longitudinal.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Success State
  const seriesParaExibir =
    metricaSelecionadaId === "todas"
      ? seriesDisponiveis
      : seriesDisponiveis.filter((s) => s.id_metrica === metricaSelecionadaId);

  return (
    <div
      data-testid="grafico-evolucao-jogo"
      className={`space-y-4 ${className}`}
    >
      {/* Cabeçalho do Jogo com Filtros Rápidos */}
      <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground">
                  {tituloJogo}
                </CardTitle>
                {historicoJogo.jogo?.versao && (
                  <Badge variant="outline" className="text-2xs font-mono text-muted-foreground">
                    v{historicoJogo.jogo.versao}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Evolução longitudinal das métricas homologadas do jogo por data das sessões clínicas
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              data-testid="badge-total-sessoes-jogo"
              variant="outline"
              className="text-2xs font-semibold bg-primary/5 text-primary border-primary/20 flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              {sessoesRegistradas} {sessoesRegistradas === 1 ? "sessão" : "sessões"}
            </Badge>
            <Badge
              data-testid="badge-total-metricas-jogo"
              variant="outline"
              className="text-2xs font-semibold bg-muted text-muted-foreground border-border flex items-center gap-1"
            >
              <Layers className="h-3 w-3" />
              {seriesDisponiveis.length} {seriesDisponiveis.length === 1 ? "métrica homologada" : "métricas homologadas"}
            </Badge>
          </div>
        </div>

        {/* Barra de Seleção de Métricas (Alvos de toque >= 44x44px - RNF07) */}
        {seriesDisponiveis.length > 1 && (
          <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border/40 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1">
              Filtrar Métrica:
            </span>
            <Button
              variant={metricaSelecionadaId === "todas" ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricaSelecionadaId("todas")}
              className="min-h-11 px-3 text-xs rounded-xl"
              data-testid="tab-metrica-todas"
            >
              Todas ({seriesDisponiveis.length})
            </Button>
            {seriesDisponiveis.map((serie) => {
              const isAtiva = metricaSelecionadaId === serie.id_metrica;
              const nomeLegivel = formatarNomeMetricaLegivel(
                serie.nome_metrica || serie.id_metrica
              );
              return (
                <Button
                  key={`tab-metrica-${serie.id_metrica}`}
                  variant={isAtiva ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMetricaSelecionadaId(serie.id_metrica)}
                  className="min-h-11 px-3 text-xs rounded-xl shrink-0"
                  data-testid={`tab-metrica-${serie.id_metrica}`}
                >
                  {nomeLegivel}
                </Button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Renderização das Métricas Selecionadas */}
      <div className="grid grid-cols-1 gap-4">
        {seriesParaExibir.map((serie) => (
          <GraficoPolimorficoMetrica
            key={`grafico-${serie.id_metrica}`}
            serie={serie}
            titulo={formatarNomeMetricaLegivel(serie.nome_metrica || serie.id_metrica)}
          />
        ))}
      </div>
    </div>
  );
}
