import * as React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Activity } from "lucide-react";
import type { SerieMetricaJogo, PontoSerieMetrica } from "../types/historico.types";

export interface GraficoLinhaTemporalProps {
  serie: SerieMetricaJogo;
  titulo?: string;
  isLoading?: boolean;
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

function formatarDataPonto(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function GraficoLinhaTemporal({
  serie,
  titulo,
  isLoading = false,
  className = "",
}: GraficoLinhaTemporalProps) {
  const [pontoAtivo, setPontoAtivo] = React.useState<PontoSerieMetrica | null>(null);

  // 1. Loading State (Skeleton Loader Estrutural - Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="grafico-linha-skeleton"
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

  // Filtragem de pontos válidos com valores numéricos
  const pontosValidos = (serie.pontos || []).filter(
    (p) => p.valor !== null && p.valor !== undefined && !isNaN(Number(p.valor))
  );

  const nomeExibicao = formatarNomeMetricaLegivel(
    titulo || serie.nome_metrica || serie.id_metrica
  );

  // 2. Empty State (Sem pontos ou dados insuficientes)
  if (pontosValidos.length === 0) {
    return (
      <div
        data-testid="grafico-linha-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/15 p-6 text-center flex flex-col items-center justify-center gap-2 h-72 ${className}`}
      >
        <div className="p-2.5 rounded-full bg-primary/10 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          Sem Dados Numéricos Registrados
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          A métrica &ldquo;{nomeExibicao}&rdquo; ainda não possui registros suficientes para gerar a curva temporal contínua.
        </p>
      </div>
    );
  }

  // Dimensões do SVG
  const svgWidth = 680;
  const svgHeight = 230;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 40;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const valores = pontosValidos.map((p) => Number(p.valor));
  const rawMin = Math.min(...valores);
  const rawMax = Math.max(...valores);

  // Margem no eixo Y para curvas não colarem nas bordas
  const delta = rawMax - rawMin;
  const minValor = delta === 0 ? Math.max(0, rawMin - 10) : Math.max(0, rawMin - delta * 0.15);
  const maxValor = delta === 0 ? rawMax + 10 : rawMax + delta * 0.15;
  const rangeY = maxValor - minValor || 1;

  const stepX =
    pontosValidos.length > 1
      ? chartWidth / (pontosValidos.length - 1)
      : chartWidth;

  const getCoords = (idx: number, val: number) => {
    const x =
      pontosValidos.length === 1
        ? padLeft + chartWidth / 2
        : padLeft + idx * stepX;
    const y = padTop + chartHeight - ((val - minValor) / rangeY) * chartHeight;
    return { x, y };
  };

  const coords = pontosValidos.map((p, idx) => getCoords(idx, Number(p.valor)));

  const pathLine =
    coords.length > 1
      ? coords
          .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(" ")
      : "";

  const pathArea =
    coords.length > 1
      ? `${pathLine} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + chartHeight} L ${coords[0].x.toFixed(1)} ${padTop + chartHeight} Z`
      : "";

  // Linhas de Grade no Eixo Y (4 linhas)
  const ticksY = [0, 0.33, 0.66, 1].map((pct) => {
    const val = minValor + pct * (maxValor - minValor);
    const y = padTop + chartHeight - pct * chartHeight;
    return { val, y };
  });

  // Média da série
  const mediaVal = valores.reduce((acc, v) => acc + v, 0) / valores.length;
  const yMedia = padTop + chartHeight - ((mediaVal - minValor) / rangeY) * chartHeight;

  const unidade = serie.unidade ? ` ${serie.unidade}` : "";

  return (
    <div
      data-testid={`grafico-linha-${serie.id_metrica}`}
      className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-3 ${className}`}
    >
      {/* Cabeçalho da Métrica */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{nomeExibicao}</h4>
            <Badge variant="outline" className="text-2xs font-medium text-muted-foreground">
              Numérica
            </Badge>
          </div>
          {serie.descricao && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {serie.descricao}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Média: <strong className="text-foreground">{mediaVal.toFixed(1)}{unidade}</strong>
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            Último: <strong className="text-primary">{valores[valores.length - 1].toFixed(1)}{unidade}</strong>
          </span>
        </div>
      </div>

      {/* Área Gráfica SVG */}
      <div className="w-full overflow-x-auto relative">
        <svg
          data-testid="grafico-linha-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-135 select-none"
          role="img"
          aria-label={`Gráfico de evolução da métrica ${nomeExibicao}`}
        >
          <title>{`Gráfico de evolução da métrica ${nomeExibicao}`}</title>
          <desc>
            {`Série temporal numérica com ${pontosValidos.length} sessões. Média de ${mediaVal.toFixed(1)}${unidade}.`}
          </desc>

          <defs>
            <linearGradient id={`gradiente-${serie.id_metrica}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #3b82f6)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-primary, #3b82f6)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grade Y e Rótulos */}
          {ticksY.map((tick, i) => (
            <g key={`tick-${i}`}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                stroke="currentColor"
                className="text-border/60"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-2xs font-mono select-none"
              >
                {tick.val.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Linha de Referência da Média */}
          <line
            x1={padLeft}
            y1={yMedia}
            x2={svgWidth - padRight}
            y2={yMedia}
            stroke="#6366f1"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            opacity="0.75"
          />

          {/* Área preenchida e Linha contínua apenas quando houver mais de 1 ponto */}
          {coords.length > 1 && (
            <>
              <path d={pathArea} fill={`url(#gradiente-${serie.id_metrica})`} />
              <path
                d={pathLine}
                fill="none"
                stroke="var(--color-primary, #3b82f6)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Pontos e Hitboxes Interativas (>= 44x44px para RNF07) */}
          {coords.map((c, idx) => {
            const ponto = pontosValidos[idx];
            const isHovered = pontoAtivo?.sessao_id === ponto.sessao_id;
            const rotuloData =
              ponto.rotulo || formatarDataPonto(ponto.data_hora) || `S${idx + 1}`;
            const valorFormatado = `${Number(ponto.valor).toFixed(1)}${unidade}`;

            return (
              <g key={`ponto-group-${idx}`}>
                {/* Rótulo de Data no Eixo X */}
                <text
                  x={c.x}
                  y={padTop + chartHeight + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-2xs font-medium select-none"
                >
                  {rotuloData}
                </text>

                {/* Valor do dado diretamente acima do ponto */}
                <text
                  x={c.x}
                  y={c.y - 10}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-bold font-mono select-none"
                >
                  {valorFormatado}
                </text>

                {/* Círculo visual do ponto */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 6 : coords.length === 1 ? 5.5 : 4}
                  className="fill-background stroke-primary transition-all duration-150"
                  strokeWidth={isHovered ? 3 : 2.5}
                />

                {/* Hitbox transparente ergonômica (44x44px) */}
                <rect
                  data-testid={`hitbox-ponto-${idx}`}
                  x={c.x - 22}
                  y={c.y - 22}
                  width="44"
                  height="44"
                  fill="transparent"
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${ponto.rotulo || formatarDataPonto(ponto.data_hora) || `Sessão ${idx + 1}`}: ${valorFormatado}`}
                  onMouseEnter={() => setPontoAtivo(ponto)}
                  onMouseLeave={() => setPontoAtivo(null)}
                  onFocus={() => setPontoAtivo(ponto)}
                  onBlur={() => setPontoAtivo(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip Dinâmico ao Selecionar Ponto */}
        {pontoAtivo && (
          <div
            data-testid="tooltip-ponto-linha"
            className="mt-2 p-2.5 rounded-xl bg-popover text-popover-foreground border border-border shadow-md flex items-center justify-between text-xs"
          >
            <div>
              <span className="font-semibold text-foreground">
                {pontoAtivo.rotulo || formatarDataPonto(pontoAtivo.data_hora) || "Sessão selecionada"}:
              </span>{" "}
              <span className="font-bold text-primary text-sm">
                {Number(pontoAtivo.valor).toFixed(1)}{unidade}
              </span>
            </div>
            {pontoAtivo.tendencia && (
              <span className="text-2xs text-muted-foreground flex items-center gap-1">
                Tendência: <strong className="text-foreground capitalize">{pontoAtivo.tendencia}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
