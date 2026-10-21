import * as React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { BarChart3, Activity } from "lucide-react";
import type { SerieMetricaJogo, PontoSerieMetrica } from "../types/historico.types";

export interface GraficoBarrasCategoricoProps {
  serie: SerieMetricaJogo;
  titulo?: string;
  isLoading?: boolean;
  className?: string;
}

// Cores temáticas para categorias/níveis
const CORES_CATEGORIAS = [
  "#3b82f6", // Azul
  "#10b981", // Esmeralda
  "#f59e0b", // Âmbar
  "#8b5cf6", // Violeta
  "#ec4899", // Rosa
  "#06b6d4", // Ciano
];

export function GraficoBarrasCategorico({
  serie,
  titulo,
  isLoading = false,
  className = "",
}: GraficoBarrasCategoricoProps) {
  const [pontoAtivo, setPontoAtivo] = React.useState<PontoSerieMetrica | null>(null);

  // 1. Loading State (Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="grafico-barras-skeleton"
        className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4 h-72 ${className}`}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex-1 w-full flex items-end gap-3 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={`bar-skel-${i}`}
              className="flex-1 rounded-t-lg"
              style={{ height: `${20 + i * 15}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>
    );
  }

  const pontosValidos = (serie.pontos || []).filter(
    (p) => p.valor !== null && p.valor !== undefined
  );

  // 2. Empty State
  if (pontosValidos.length === 0) {
    return (
      <div
        data-testid="grafico-barras-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/15 p-6 text-center flex flex-col items-center justify-center gap-2 h-72 ${className}`}
      >
        <div className="p-2.5 rounded-full bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          Sem Dados Categóricos Registrados
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          A métrica &ldquo;{serie.nome_metrica || serie.id_metrica}&rdquo; ainda não possui registros para traçar a evolução categórica.
        </p>
      </div>
    );
  }

  // Identificação das categorias (do manifesto ou deduzidas da série)
  const categorias = React.useMemo(() => {
    if (serie.valores && serie.valores.length > 0) {
      return serie.valores;
    }
    const unicas = Array.from(new Set(pontosValidos.map((p) => String(p.valor))));
    return unicas.length > 0 ? unicas : ["Padrão"];
  }, [serie.valores, pontosValidos]);

  // Dimensões do SVG
  const svgWidth = 680;
  const svgHeight = 220;
  const padLeft = 80;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const totalBarras = pontosValidos.length;
  const barSlotWidth = chartWidth / totalBarras;
  const barWidth = Math.min(48, Math.max(16, barSlotWidth * 0.55));

  const totalNiveis = Math.max(1, categorias.length);

  // Distribuição agregada por categoria
  const distribuicao = React.useMemo(() => {
    const mapa: Record<string, number> = {};
    categorias.forEach((c) => {
      mapa[c] = 0;
    });
    pontosValidos.forEach((p) => {
      const v = String(p.valor);
      mapa[v] = (mapa[v] || 0) + 1;
    });
    return mapa;
  }, [categorias, pontosValidos]);

  const nomeExibicao = titulo || serie.nome_metrica || serie.id_metrica;
  const isOrdinal = serie.tipo_metrica === "ordinal";

  return (
    <div
      data-testid={`grafico-barras-${serie.id_metrica}`}
      className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-3 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{nomeExibicao}</h4>
            <Badge variant="outline" className="text-2xs font-medium text-muted-foreground">
              {isOrdinal ? "Ordinal" : "Categórica"}
            </Badge>
          </div>
          {serie.descricao && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {serie.descricao}
            </p>
          )}
        </div>

        {/* Mini Legenda de Categorias */}
        <div className="flex flex-wrap items-center gap-2">
          {categorias.slice(0, 4).map((cat, idx) => (
            <div key={`legenda-${cat}`} className="flex items-center gap-1 text-2xs text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full inline-block"
                style={{ backgroundColor: CORES_CATEGORIAS[idx % CORES_CATEGORIAS.length] }}
              />
              <span>{cat}</span>
              <span className="font-semibold text-foreground">({distribuicao[cat] || 0})</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG de Barras Verticais */}
      <div className="w-full overflow-x-auto relative">
        <svg
          data-testid="grafico-barras-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-135 select-none"
          role="img"
          aria-label={`Gráfico de barras categórico da métrica ${nomeExibicao}`}
        >
          <title>{`Gráfico categórico de ${nomeExibicao}`}</title>
          <desc>
            {`Distribuição por sessão das categorias: ${categorias.join(", ")}.`}
          </desc>

          {/* Linhas de Grade por Nível de Categoria no Eixo Y */}
          {categorias.map((cat, idx) => {
            const nivelIndex = idx + 1; // 1-indexed
            const y = padTop + chartHeight - (nivelIndex / totalNiveis) * chartHeight;

            return (
              <g key={`grid-cat-${cat}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-2xs select-none font-medium max-w-20"
                >
                  {cat}
                </text>
              </g>
            );
          })}

          {/* Linha de Base (Eixo X) */}
          <line
            x1={padLeft}
            y1={padTop + chartHeight}
            x2={svgWidth - padRight}
            y2={padTop + chartHeight}
            stroke="currentColor"
            className="text-border"
            strokeWidth="1.5"
          />

          {/* Barras e Hitboxes por Sessão */}
          {pontosValidos.map((ponto, idx) => {
            const valorStr = String(ponto.valor);
            const catIndex = categorias.indexOf(valorStr);
            const nivel = catIndex >= 0 ? catIndex + 1 : 1;
            const barHeight = (nivel / totalNiveis) * chartHeight;

            const xCenter = padLeft + idx * barSlotWidth + barSlotWidth / 2;
            const x = xCenter - barWidth / 2;
            const y = padTop + chartHeight - barHeight;

            const cor =
              catIndex >= 0
                ? CORES_CATEGORIAS[catIndex % CORES_CATEGORIAS.length]
                : "#6b7280";

            const isHovered = pontoAtivo?.sessao_id === ponto.sessao_id;

            return (
              <g key={`barra-group-${idx}`}>
                {/* Rótulo Eixo X */}
                <text
                  x={xCenter}
                  y={padTop + chartHeight + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-2xs select-none"
                >
                  {ponto.rotulo || `S${idx + 1}`}
                </text>

                {/* Barra SVG */}
                <rect
                  data-testid={`barra-svg-${idx}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  fill={cor}
                  opacity={isHovered ? 1 : 0.85}
                  className="transition-all duration-150"
                />

                {/* Hitbox ergonômica (>= 44x44px para RNF07) */}
                <rect
                  data-testid={`hitbox-barra-${idx}`}
                  x={xCenter - 22}
                  y={y - 10}
                  width="44"
                  height={Math.max(44, barHeight + 20)}
                  fill="transparent"
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${ponto.rotulo || `Sessão ${idx + 1}`}: ${valorStr}`}
                  onMouseEnter={() => setPontoAtivo(ponto)}
                  onMouseLeave={() => setPontoAtivo(null)}
                  onFocus={() => setPontoAtivo(ponto)}
                  onBlur={() => setPontoAtivo(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip Dinâmico */}
        {pontoAtivo && (
          <div
            data-testid="tooltip-ponto-barras"
            className="mt-2 p-2.5 rounded-xl bg-popover text-popover-foreground border border-border shadow-md flex items-center justify-between text-xs"
          >
            <div>
              <span className="font-semibold text-foreground">
                {pontoAtivo.rotulo || "Sessão selecionada"}:
              </span>{" "}
              <Badge
                variant="outline"
                className="ml-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20"
              >
                {String(pontoAtivo.valor)}
              </Badge>
            </div>
            <span className="text-2xs text-muted-foreground">
              {new Date(pontoAtivo.data_hora).toLocaleDateString("pt-BR")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
