import React, { useId } from "react";

/**
 * ============================================================================
 * COMPONENTE: SparklineTendencia (InTEA)
 * Conformidade: WCAG 2.1 AA (a11y), Prevenção de Layout Shift (CLS)
 * Renderização: Puramente SVG nativo (Zero bibliotecas externas adicionais)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface SparklineTendenciaProps {
  /**
   * Série histórica de valores numéricos de desempenho/evolução.
   * Ex: [45, 52, 60, 58, 72]
   */
  data?: number[] | null;

  /** Largura do componente SVG (padrão: 60) */
  width?: number | string;

  /** Altura do componente SVG (padrão: 20) */
  height?: number | string;

  /** Classes utilitárias Tailwind CSS aplicadas ao elemento raiz <svg> */
  className?: string;

  /** Espessura do traço da linha em pixels (padrão: 2) */
  strokeWidth?: number;

  /** Se deve renderizar ponto âncora no último registro (padrão: true) */
  mostrarPontoAncora?: boolean;

  /** Identificador para testes automatizados */
  "data-testid"?: string;
}

export type TipoTendencia = "alta" | "queda" | "estavel" | "insuficiente";

/**
 * Calcula a tendência semântica e gera rótulo textual acessível detalhado.
 */
function calcularDescricaoAcessivel(data: number[] | null | undefined): {
  tipo: TipoTendencia;
  descricao: string;
} {
  if (!data || data.length < 2) {
    return {
      tipo: "insuficiente",
      descricao: "Dados históricos insuficientes para exibir tendência",
    };
  }

  const primeiro = data[0];
  const ultimo = data[data.length - 1];
  const diferenca = ultimo - primeiro;

  if (diferenca > 0) {
    return {
      tipo: "alta",
      descricao: `Tendência de alta: início em ${primeiro}% e término em ${ultimo}%`,
    };
  }

  if (diferenca < 0) {
    return {
      tipo: "queda",
      descricao: `Tendência de queda: início em ${primeiro}% e término em ${ultimo}%`,
    };
  }

  return {
    tipo: "estavel",
    descricao: `Tendência estável em ${ultimo}%`,
  };
}

/**
 * Componente SVG Puro para visualização de micro-tendências temporais (Sparkline).
 */
export const SparklineTendencia: React.FC<SparklineTendenciaProps> = ({
  data,
  width = 60,
  height = 20,
  className = "",
  strokeWidth = 2,
  mostrarPontoAncora = true,
  "data-testid": testId = "sparkline-tendencia",
}) => {
  const titleId = useId();
  const { tipo, descricao } = calcularDescricaoAcessivel(data);

  // Parâmetros do sistema de coordenadas com padding de segurança
  const VIEWBOX_WIDTH = 60;
  const VIEWBOX_HEIGHT = 20;
  const PADDING_X = 3;
  const PADDING_Y = 3;

  // Empty State: dados nulos, vazios ou com menos de 2 pontos históricos
  if (!data || data.length < 2) {
    return (
      <svg
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        width={width}
        height={height}
        aria-label={descricao}
        aria-labelledby={titleId}
        data-testid={testId}
        className={`inline-block overflow-visible shrink-0 text-muted-foreground/40 dark:text-muted-foreground/30 ${className}`}
      >
        <title id={titleId}>{descricao}</title>
        {/* Linha guia atenuada horizontal representando estado vazio gracioso */}
        <line
          x1={PADDING_X}
          y1={VIEWBOX_HEIGHT / 2}
          x2={VIEWBOX_WIDTH - PADDING_X}
          y2={VIEWBOX_HEIGHT / 2}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray="2 3"
          strokeLinecap="round"
          data-testid="sparkline-empty-state"
        />
      </svg>
    );
  }

  // Normalização de coordenadas geométricas estáveis dentro de viewBox="0 0 60 20"
  const minValor = Math.min(...data);
  const maxValor = Math.max(...data);
  const deltaValor = maxValor - minValor;
  const totalPontos = data.length;

  const larguraUtil = VIEWBOX_WIDTH - 2 * PADDING_X;
  const alturaUtil = VIEWBOX_HEIGHT - 2 * PADDING_Y;

  const coordenadas = data.map((valor, idx) => {
    // Normalização no eixo X proporcional aos índices
    const x = PADDING_X + (idx / (totalPontos - 1)) * larguraUtil;

    // Normalização no eixo Y invertido (0 é o topo no SVG)
    let y = VIEWBOX_HEIGHT / 2;
    if (deltaValor > 0) {
      const normalizado = (valor - minValor) / deltaValor;
      y = PADDING_Y + (1 - normalizado) * alturaUtil;
    }

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const pointsString = coordenadas.map((p) => `${p.x},${p.y}`).join(" ");
  const ultimoPonto = coordenadas[coordenadas.length - 1];

  // Diferenciação visual acessível para além da cor (classes temáticas modo claro e escuro)
  let estiloTendencia = "text-slate-600 dark:text-slate-400 stroke-slate-600 dark:stroke-slate-400";
  if (tipo === "alta") {
    estiloTendencia = "text-emerald-600 dark:text-emerald-400 stroke-emerald-600 dark:stroke-emerald-400";
  } else if (tipo === "queda") {
    estiloTendencia = "text-rose-600 dark:text-rose-400 stroke-rose-600 dark:stroke-rose-400";
  }

  return (
    <svg
      role="img"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      aria-label={descricao}
      aria-labelledby={titleId}
      data-testid={testId}
      className={`inline-block overflow-visible shrink-0 transition-colors ${estiloTendencia} ${className}`}
    >
      <title id={titleId}>{descricao}</title>

      {/* Traçado linear contínuo do sparkline */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pointsString}
        data-testid="sparkline-polyline"
      />

      {/* Ponto âncora no último registro (Diferenciação visual acessível para além da cor) */}
      {mostrarPontoAncora && (
        <circle
          cx={ultimoPonto.x}
          cy={ultimoPonto.y}
          r={2.4}
          fill="currentColor"
          stroke="var(--color-background, #ffffff)"
          strokeWidth={1}
          className="dark:stroke-background transition-transform"
          data-testid="sparkline-anchor-point"
        />
      )}
    </svg>
  );
};

export default SparklineTendencia;

