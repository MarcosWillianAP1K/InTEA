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
import type { TentativaRespostaPonto } from "../../types";
import {
  TrendingUp,
  Activity,
  Sliders,
  CheckCircle2,
  XCircle,
  Timer,
  Info,
} from "lucide-react";

export interface GraficoEvolutivoResultadoProps {
  tentativas?: TentativaRespostaPonto[];
  tempoMedioReferencia?: number; // em segundos (ex: 2.5)
  titulo?: string;
  subtitulo?: string;
  isLoading?: boolean;
  isModoLivre?: boolean;
  className?: string;
}

export function GraficoEvolutivoResultado({
  tentativas = [],
  tempoMedioReferencia,
  titulo = "Evolução do Tempo de Resposta e Modulações DDA",
  subtitulo = "Curva contínua de reação do paciente por tentativa com marcadores de intervenção dinâmica",
  isLoading = false,
  isModoLivre = false,
  className = "",
}: GraficoEvolutivoResultadoProps) {
  const [pontoAtivo, setPontoAtivo] = React.useState<TentativaRespostaPonto | null>(null);

  // 1. Loading State (Skeleton Loader Estrutural - Zero CLS)
  if (isLoading) {
    return (
      <Card
        data-testid="grafico-evolutivo-skeleton"
        className={`rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 h-102.5 ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-64 rounded-md" />
            <Skeleton className="h-3 w-96 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex-1 w-full flex flex-col justify-end gap-2 pt-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
      </Card>
    );
  }

  // 2. Empty State (Tentativas insuficientes ou nulas)
  if (!tentativas || tentativas.length === 0) {
    return (
      <Card
        data-testid="grafico-evolutivo-empty"
        className={`rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center ${className}`}
      >
        <CardContent className="flex flex-col items-center justify-center p-0 gap-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Tentativas Temporais Insuficientes
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Não foram registradas tentativas ou eventos com tempo de resposta suficientes para traçar a curva evolutiva desta sessão.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dimensões do SVG
  const svgWidth = 760;
  const svgHeight = 250;
  const padLeft = 50;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // Cálculos estatísticos da série
  const tempos = tentativas.map((t) => t.tempoRespostaSegundos);
  const maxTempoOriginal = Math.max(...tempos, tempoMedioReferencia ?? 0, 1);
  const maxTempo = Math.ceil(maxTempoOriginal * 1.25); // Margem superior confortável
  const minTempo = 0;

  const totalIntervencoesDda = isModoLivre
    ? 0
    : tentativas.filter((t) => Boolean(t.intervencaoDda)).length;

  const mediaTempoReal =
    tempos.reduce((acc, curr) => acc + curr, 0) / (tempos.length || 1);

  const tempoReferenciaFinal = tempoMedioReferencia ?? mediaTempoReal;

  // Função de mapeamento de coordenadas
  const stepX = chartWidth / Math.max(1, tentativas.length - 1);
  const getCoords = (tentativaIdx: number, tempoResposta: number) => {
    const x = padLeft + tentativaIdx * stepX;
    const y = padTop + chartHeight - ((tempoResposta - minTempo) / (maxTempo - minTempo)) * chartHeight;
    return { x, y };
  };

  // Construção do caminho SVG da curva
  const pontosCoords = tentativas.map((t, idx) => getCoords(idx, t.tempoRespostaSegundos));
  const pathD = pontosCoords
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Área preenchida sob a curva
  const areaD = `${pathD} L ${pontosCoords[pontosCoords.length - 1].x.toFixed(1)} ${padTop + chartHeight} L ${pontosCoords[0].x.toFixed(1)} ${padTop + chartHeight} Z`;

  // Linha horizontal de média de referência
  const yReferencia = getCoords(0, tempoReferenciaFinal).y;

  // Linhas de grade no Eixo Y (4 divisões)
  const gridTicksY = [0, 0.33, 0.66, 1].map((pct) => {
    const val = minTempo + pct * (maxTempo - minTempo);
    const y = padTop + chartHeight - pct * chartHeight;
    return { val: Number(val.toFixed(1)), y };
  });

  return (
    <Card
      data-testid="grafico-evolutivo-container"
      className={`rounded-2xl border border-border bg-card shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${className}`}
    >
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {titulo}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {subtitulo}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-2xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 flex items-center gap-1"
            >
              <Timer className="h-3 w-3" />
              Média: {mediaTempoReal.toFixed(2)}s
            </Badge>

            {isModoLivre ? (
              <Badge
                variant="outline"
                className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              >
                Modo Livre: Sem DDA (RN01)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-2xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center gap-1"
              >
                <Sliders className="h-3 w-3" />
                {totalIntervencoesDda} {totalIntervencoesDda === 1 ? "Modulação DDA" : "Modulações DDA"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 flex-1 flex flex-col justify-between gap-4">
        {/* Container Responsivo do SVG */}
        <div className="w-full overflow-x-auto relative">
          <svg
            data-testid="grafico-evolutivo-svg"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-155 select-none"
            aria-label="Gráfico de tempo de resposta da sessão clínica"
          >
            <defs>
              {/* Gradiente sob a curva */}
              <linearGradient id="gradiente-tempo-resposta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
              </linearGradient>

              {/* Padrão de halo para intervenções de DDA */}
              <radialGradient id="halo-dda" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#9333ea" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* Linhas de Grade Horizontais e Rótulos do Eixo Y */}
            {gridTicksY.map((tick, i) => (
              <g key={`grid-y-${i}`}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={svgWidth - padRight}
                  y2={tick.y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-mono select-none"
                >
                  {tick.val}s
                </text>
              </g>
            ))}

            {/* Linha de Referência da Média Clínica */}
            <line
              data-testid="linha-tempo-medio"
              x1={padLeft}
              y1={yReferencia}
              x2={svgWidth - padRight}
              y2={yReferencia}
              stroke="#eab308"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              strokeOpacity="0.8"
            />
            <text
              x={svgWidth - padRight}
              y={yReferencia - 6}
              textAnchor="end"
              className="fill-amber-600 dark:fill-amber-400 text-[10px] font-semibold font-mono"
            >
              Média ({tempoReferenciaFinal.toFixed(2)}s)
            </text>

            {/* Área Gradiente sob a Curva */}
            <path d={areaD} fill="url(#gradiente-tempo-resposta)" />

            {/* Linha Principal da Curva */}
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            />

            {/* Marcadores de Intervenção DDA (Linhas Verticais e Halos) */}
            {!isModoLivre &&
              tentativas.map((t, idx) => {
                if (!t.intervencaoDda) return null;
                const { x, y } = pontosCoords[idx];
                return (
                  <g key={`dda-marker-${idx}`} data-testid={`marcador-dda-${idx}`}>
                    {/* Linha vertical até a base */}
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + chartHeight}
                      stroke="#9333ea"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      strokeOpacity="0.6"
                    />
                    {/* Halo de destaque */}
                    <circle cx={x} cy={y} r="12" fill="url(#halo-dda)" />
                    {/* Anel Externo DDA */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6.5"
                      fill="#9333ea"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer"
                    />
                  </g>
                );
              })}

            {/* Pontos de Tentativas Clínicas (Acertos vs Erros) */}
            {tentativas.map((t, idx) => {
              const { x, y } = pontosCoords[idx];
              const isDda = !isModoLivre && Boolean(t.intervencaoDda);
              const isHovered = pontoAtivo?.tentativa === t.tentativa;

              return (
                <g
                  key={`ponto-tentativa-${idx}`}
                  data-testid={`ponto-tentativa-${t.tentativa}`}
                  className="cursor-pointer group"
                  onMouseEnter={() => setPontoAtivo(t)}
                  onMouseLeave={() => setPontoAtivo(null)}
                  onClick={() => setPontoAtivo(pontoAtivo?.tentativa === t.tentativa ? null : t)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : isDda ? 4.5 : 3.5}
                    fill={t.acerto ? "#10b981" : "#f43f5e"}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-150"
                  />
                  {/* Rótulo de tempo no Eixo X */}
                  {(idx === 0 ||
                    idx === tentativas.length - 1 ||
                    idx % Math.ceil(tentativas.length / 6) === 0) && (
                    <text
                      x={x}
                      y={padTop + chartHeight + 16}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] font-mono select-none"
                    >
                      {t.tempoFormatado}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bloco de Detalhe Interativo do Ponto Selecionado / Hover */}
        {pontoAtivo ? (
          <div
            data-testid="tooltip-ponto-ativo"
            className="p-3 rounded-xl bg-accent/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all animate-in fade-in-50 duration-200"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg ${
                  pontoAtivo.acerto
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                }`}
              >
                {pontoAtivo.acerto ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Tentativa #{pontoAtivo.tentativa} ({pontoAtivo.tempoFormatado})
                </span>
                <span className="text-muted-foreground ml-2">
                  Tempo de Reação:{" "}
                  <strong className="text-foreground font-mono">
                    {pontoAtivo.tempoRespostaSegundos.toFixed(2)}s
                  </strong>
                </span>
              </div>
            </div>

            {pontoAtivo.intervencaoDda && !isModoLivre && (
              <Badge
                variant="outline"
                className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center gap-1.5 w-fit font-medium"
              >
                <Sliders className="h-3 w-3" />
                {pontoAtivo.intervencaoDda.tipoIntervencao}: {pontoAtivo.intervencaoDda.detalhes ?? "Ajuste Dinâmico"}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span>Passe o mouse ou toque nos pontos do gráfico para inspecionar os detalhes clínicos de cada tentativa.</span>
          </div>
        )}

        {/* Legenda do Gráfico */}
        <div
          data-testid="grafico-legenda"
          className="flex flex-wrap items-center justify-between gap-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Acerto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Erro</span>
            </div>
            {!isModoLivre && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600 ring-2 ring-purple-300 dark:ring-purple-900" />
                <span>Intervenção DDA</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-amber-500 border-dashed" />
              <span>Média da Sessão</span>
            </div>
          </div>

          <span className="text-2xs text-muted-foreground font-mono">
            Total de {tentativas.length} tentativas analisadas
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
