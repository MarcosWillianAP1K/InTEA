import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import type { PontoHistoricoTelemetria } from "../../types";
import { TrendingUp, Activity } from "lucide-react";

export interface TelemetriaChartProps {
  historico: PontoHistoricoTelemetria[];
  titulo?: string;
}

/**
 * ============================================================================
 * COMPONENTE: TelemetriaChart (Front-end 2 — Luma Maiara / Card 4.1)
 * Renderização SVG vetorial reativa e ultraleve de séries temporais clínicas
 * ============================================================================
 */

/**
 * Gráfico vetorial SVG em tempo real para visualização contínua de engajamento e atenção do paciente.
 * Renderiza curvas e gradientes dinâmicos de alta performance sem bibliotecas pesadas de terceiros.
 */
export function TelemetriaChart({
  historico,
  titulo = "Evolução Contínua de Engajamento e Atenção",
}: TelemetriaChartProps) {
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  if (historico.length === 0) {
    return (
      <Card
        data-testid="telemetria-chart-empty"
        className="rounded-2xl border border-border bg-card shadow-xs"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#0b3294] dark:text-blue-400" />
            {titulo}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Acompanhamento temporal segundo a segundo
          </CardDescription>
        </CardHeader>
        <CardContent className="h-44 flex flex-col items-center justify-center text-center p-4">
          <p className="text-xs text-muted-foreground">
            Aguardando pontos de telemetria para traçar a curva de engajamento do paciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Gera coordenadas SVG
  const pontos = historico.length === 1 ? [historico[0], historico[0]] : historico;
  const stepX = (width - paddingX * 2) / Math.max(1, pontos.length - 1);

  // Normaliza valores 0..100 para a altura SVG
  const getCoordinates = (value: number, index: number) => {
    const x = paddingX + index * stepX;
    const y = height - paddingY - (value / 100) * (height - paddingY * 2);
    return { x, y };
  };

  const caminhoEngajamento = pontos
    .map((p, i) => {
      const { x, y } = getCoordinates(p.engajamento, i);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const caminhoAtencao = pontos
    .map((p, i) => {
      const { x, y } = getCoordinates(p.atencao, i);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Área preenchida sob a curva de engajamento
  const ultimaCoord = getCoordinates(pontos[pontos.length - 1].engajamento, pontos.length - 1);
  const primeiraCoord = getCoordinates(pontos[0].engajamento, 0);
  const areaEngajamento = `${caminhoEngajamento} L ${ultimaCoord.x} ${height - paddingY} L ${primeiraCoord.x} ${height - paddingY} Z`;

  const ultimoPonto = pontos[pontos.length - 1];

  return (
    <Card
      data-testid="telemetria-chart-container"
      className="rounded-2xl border border-border bg-card shadow-xs"
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0b3294] dark:text-blue-400" />
            {titulo}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Acompanhamento temporal em tempo real
          </CardDescription>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 text-2xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0b3294] dark:bg-blue-400 inline-block" />
            <span>Engajamento ({ultimoPonto.engajamento}%)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
            <span>Atenção ({ultimoPonto.atencao}%)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-44 select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="engajamentoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b3294" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0b3294" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de grade de referência (25%, 50%, 75%, 100%) */}
            {[25, 50, 75, 100].map((level) => {
              const y = height - paddingY - (level / 100) * (height - paddingY * 2);
              return (
                <g key={level}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-border/60"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground text-[9px] font-mono"
                  >
                    {level}%
                  </text>
                </g>
              );
            })}

            {/* Área sombreada */}
            <path d={areaEngajamento} fill="url(#engajamentoGrad)" />

            {/* Linha Atenção */}
            <path
              d={caminhoAtencao}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Linha Engajamento */}
            <path
              d={caminhoEngajamento}
              fill="none"
              stroke="#0b3294"
              strokeWidth="2.5"
            />

            {/* Marcadores de tempo no eixo X */}
            {pontos.map((p, i) => {
              if (i === 0 || i === pontos.length - 1 || i % Math.ceil(pontos.length / 4) === 0) {
                const { x } = getCoordinates(0, i);
                return (
                  <text
                    key={i}
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px] font-mono"
                  >
                    {p.tempoFormatado}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
