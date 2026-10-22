import * as React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { ToggleLeft } from "lucide-react";
import type { SerieMetricaJogo, PontoSerieMetrica } from "../types/historico.types";

export interface IndicadorBooleanoMetricaProps {
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

export function IndicadorBooleanoMetrica({
  serie,
  titulo,
  isLoading = false,
  className = "",
}: IndicadorBooleanoMetricaProps) {
  const [pontoAtivo, setPontoAtivo] = React.useState<PontoSerieMetrica | null>(null);

  // 1. Loading State (Zero CLS)
  if (isLoading) {
    return (
      <div
        data-testid="indicador-booleano-skeleton"
        className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4 h-72 ${className}`}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex-1 w-full flex items-center justify-around px-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={`bool-skel-${i}`} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>
    );
  }

  const pontosValidos = (serie.pontos || []).filter(
    (p) => p.valor !== null && p.valor !== undefined
  );

  const nomeExibicao = formatarNomeMetricaLegivel(
    titulo || serie.nome_metrica || serie.id_metrica
  );

  // 2. Empty State
  if (pontosValidos.length === 0) {
    return (
      <div
        data-testid="indicador-booleano-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/15 p-6 text-center flex flex-col items-center justify-center gap-2 h-72 ${className}`}
      >
        <div className="p-2.5 rounded-full bg-primary/10 text-primary">
          <ToggleLeft className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          Sem Dados Booleanos Registrados
        </h4>
        <p className="text-xs text-muted-foreground max-w-sm">
          A métrica &ldquo;{nomeExibicao}&rdquo; não possui registros booleanos registrados nesta série temporal.
        </p>
      </div>
    );
  }

  // Estatísticas booleanas
  const totalPontos = pontosValidos.length;
  const totalTrue = pontosValidos.filter((p) => Boolean(p.valor)).length;
  const porcentagemTrue = totalPontos > 0 ? (totalTrue / totalPontos) * 100 : 0;

  // Dimensões SVG
  const svgWidth = 680;
  const svgHeight = 220;
  const padLeft = 50;
  const padRight = 50;
  const padTop = 30;
  const padBottom = 40;

  const chartWidth = svgWidth - padLeft - padRight;
  const stepX = totalPontos > 1 ? chartWidth / (totalPontos - 1) : chartWidth;
  const yCenter = padTop + (svgHeight - padTop - padBottom) / 2;

  return (
    <div
      data-testid={`indicador-booleano-${serie.id_metrica}`}
      className={`rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between gap-3 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{nomeExibicao}</h4>
            <Badge variant="outline" className="text-2xs font-medium text-muted-foreground">
              Booleana
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
            Ocorrências: <strong className="text-foreground">{totalTrue} de {totalPontos}</strong> ({porcentagemTrue.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Linha do Tempo Discreta em SVG */}
      <div className="w-full overflow-x-auto relative">
        <svg
          data-testid="indicador-booleano-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-135 select-none"
          role="img"
          aria-label={`Linha do tempo booleana da métrica ${nomeExibicao}`}
        >
          <title>{`Linha do tempo booleana de ${nomeExibicao}`}</title>
          <desc>
            {`Série temporal booleana com ${totalTrue} ocorrências positivas de um total de ${totalPontos} sessões.`}
          </desc>

          {/* Linha central da timeline */}
          <line
            x1={padLeft}
            y1={yCenter}
            x2={svgWidth - padRight}
            y2={yCenter}
            stroke="currentColor"
            className="text-border"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Nós da Linha do Tempo e Hitboxes Ergonômicas */}
          {pontosValidos.map((ponto, idx) => {
            const x = totalPontos === 1 ? padLeft + chartWidth / 2 : padLeft + idx * stepX;
            const isPositivo = Boolean(ponto.valor);
            const isHovered = pontoAtivo?.sessao_id === ponto.sessao_id;
            const rotuloData =
              ponto.rotulo || formatarDataPonto(ponto.data_hora) || `S${idx + 1}`;

            return (
              <g key={`bool-group-${idx}`}>
                {/* Rótulo de Data no Eixo X */}
                <text
                  x={x}
                  y={yCenter + 38}
                  textAnchor="middle"
                  className="fill-muted-foreground text-2xs font-medium select-none"
                >
                  {rotuloData}
                </text>

                {/* Marcador Visual Externo (Anel/Halo) */}
                <circle
                  cx={x}
                  cy={yCenter}
                  r={isHovered ? 20 : 16}
                  fill={
                    isPositivo
                      ? "rgba(16, 185, 129, 0.15)" // Verde esmeralda suave
                      : "rgba(107, 114, 128, 0.12)" // Cinza neutro suave
                  }
                  stroke={isPositivo ? "#10b981" : "#9ca3af"}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150"
                />

                {/* Ícone interno (Check ou X) via SVG path */}
                {isPositivo ? (
                  // Checkmark SVG path
                  <path
                    d={`M ${x - 5} ${yCenter} L ${x - 1} ${yCenter + 4} L ${x + 6} ${yCenter - 4}`}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  // X mark SVG path
                  <path
                    d={`M ${x - 4} ${yCenter - 4} L ${x + 4} ${yCenter + 4} M ${x + 4} ${yCenter - 4} L ${x - 4} ${yCenter + 4}`}
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}

                {/* Rótulo de status Sim/Não acima do nó */}
                <text
                  x={x}
                  y={yCenter - 24}
                  textAnchor="middle"
                  className={`text-2xs font-semibold select-none ${
                    isPositivo
                      ? "fill-emerald-600 dark:fill-emerald-400"
                      : "fill-muted-foreground"
                  }`}
                >
                  {isPositivo ? "Sim" : "Não"}
                </text>

                {/* Hitbox ergonômica (>= 44x44px) */}
                <rect
                  data-testid={`hitbox-booleana-${idx}`}
                  x={x - 22}
                  y={yCenter - 22}
                  width="44"
                  height="44"
                  fill="transparent"
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${ponto.rotulo || formatarDataPonto(ponto.data_hora) || `Sessão ${idx + 1}`}: ${isPositivo ? "Sim (Verdadeiro)" : "Não (Falso)"}`}
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
            data-testid="tooltip-ponto-booleano"
            className="mt-2 p-2.5 rounded-xl bg-popover text-popover-foreground border border-border shadow-md flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {pontoAtivo.rotulo || formatarDataPonto(pontoAtivo.data_hora) || "Sessão selecionada"}:
              </span>
              <Badge
                variant="outline"
                className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                  Boolean(pontoAtivo.valor)
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {Boolean(pontoAtivo.valor) ? "Sim (Ocorreu)" : "Não (Não Ocorreu)"}
              </Badge>
            </div>
            {pontoAtivo.data_hora && (
              <span className="text-2xs text-muted-foreground">
                {new Date(pontoAtivo.data_hora).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
