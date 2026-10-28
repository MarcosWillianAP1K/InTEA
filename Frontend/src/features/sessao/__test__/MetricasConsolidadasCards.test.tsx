import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MetricasConsolidadasCards,
  formatarDuracaoClinica,
} from "../components/resultado/MetricasConsolidadasCards";
import type { MetricasConsolidadasDados } from "../types";

describe("Card 4.1 — MetricasConsolidadasCards (Front-end 2 — Luma Maiara)", () => {
  describe("Função utilitária formatarDuracaoClinica", () => {
    it("deve retornar 00m 00s para valores menores ou iguais a zero", () => {
      expect(formatarDuracaoClinica(0)).toBe("00m 00s");
      expect(formatarDuracaoClinica(-15)).toBe("00m 00s");
    });

    it("deve formatar minutos e segundos com zeros à esquerda", () => {
      expect(formatarDuracaoClinica(75)).toBe("01m 15s");
      expect(formatarDuracaoClinica(1200)).toBe("20m 00s");
      expect(formatarDuracaoClinica(5)).toBe("00m 05s");
    });

    it("deve formatar durações superiores a 1 hora", () => {
      expect(formatarDuracaoClinica(3665)).toBe("1h 01m 05s");
      expect(formatarDuracaoClinica(7200)).toBe("2h 00m 00s");
    });
  });

  describe("Renderização de Estados Estruturais", () => {
    it("deve renderizar o estado de loading com Skeleton Loaders geométricos (zero CLS)", () => {
      render(<MetricasConsolidadasCards isLoading={true} />);

      const skeletonContainer = screen.getByTestId("metricas-consolidadas-skeleton");
      expect(skeletonContainer).toBeDefined();

      // Devem existir 5 cards de skeleton no grid
      expect(skeletonContainer.children.length).toBe(5);
    });

    it("deve renderizar o empty state amigável quando métricas forem nulas ou ausentes", () => {
      render(<MetricasConsolidadasCards metricas={null} isLoading={false} />);

      expect(screen.getByTestId("metricas-consolidadas-empty")).toBeDefined();
      expect(
        screen.getByText("Métricas Consolidadas Não Disponíveis")
      ).toBeDefined();
      expect(
        screen.getByText(/Não foram encontrados dados analíticos consolidados/)
      ).toBeDefined();
    });
  });

  describe("Exibição dos 5 Indicadores Clínicos Principais", () => {
    const metricasExemplo: MetricasConsolidadasDados = {
      duracaoSegundos: 1245, // 20m 45s
      taxaConclusao: 88.5,
      intervencoesDda: 3,
      pontuacaoGeral: 1450,
      estabilidadeFoco: 85,
    };

    it("deve exibir valores formatados em todos os 5 cards", () => {
      render(<MetricasConsolidadasCards metricas={metricasExemplo} />);

      // 1. Tempo Total
      expect(screen.getByTestId("card-tempo-total-valor").textContent).toBe(
        "20m 45s"
      );
      expect(screen.getByText("Sessão Clínica")).toBeDefined();

      // 2. Taxa de Conclusão
      expect(screen.getByTestId("card-taxa-conclusao-valor").textContent).toBe(
        "88.5%"
      );
      expect(screen.getByText("Excelente")).toBeDefined();

      // 3. Intervenções DDA
      expect(screen.getByTestId("card-intervencoes-dda-valor").textContent).toBe(
        "3"
      );
      expect(screen.getByText("3 ajustes")).toBeDefined();

      // 4. Pontuação Geral
      expect(screen.getByTestId("card-pontuacao-geral-valor").textContent).toBe(
        (1450).toLocaleString("pt-BR")
      );
      expect(screen.getByText("Score Jogo")).toBeDefined();

      // 5. Estabilidade de Foco
      expect(screen.getByTestId("card-estabilidade-foco-valor").textContent).toBe(
        "85%"
      );
      expect(screen.getByText("Foco Alto")).toBeDefined();
    });

    it("deve classificar taxa de conclusão como Satisfatório para faixa entre 50% e 79%", () => {
      render(
        <MetricasConsolidadasCards
          metricas={{
            ...metricasExemplo,
            taxaConclusao: 65,
          }}
        />
      );

      expect(screen.getByText("Satisfatório")).toBeDefined();
    });

    it("deve classificar taxa de conclusão como Abaixo do Esperado para valores < 50%", () => {
      render(
        <MetricasConsolidadasCards
          metricas={{
            ...metricasExemplo,
            taxaConclusao: 42.4,
          }}
        />
      );

      expect(screen.getByText("Abaixo do Esperado")).toBeDefined();
    });

    it("deve classificar estabilidade de foco como Moderado (60-79%) e Oscilante (<60%)", () => {
      const { rerender } = render(
        <MetricasConsolidadasCards
          metricas={{
            ...metricasExemplo,
            estabilidadeFoco: 68,
          }}
        />
      );

      expect(screen.getByText("Moderado")).toBeDefined();

      rerender(
        <MetricasConsolidadasCards
          metricas={{
            ...metricasExemplo,
            estabilidadeFoco: 45,
          }}
        />
      );

      expect(screen.getByText("Oscilante")).toBeDefined();
    });
  });

  describe("Conformidade com RN01 (Modo Livre)", () => {
    it("deve desativar e sinalizar o DDA quando isModoLivre for true", () => {
      const metricasModoLivre: MetricasConsolidadasDados = {
        duracaoSegundos: 600,
        taxaConclusao: 70,
        intervencoesDda: 0,
        pontuacaoGeral: 500,
        estabilidadeFoco: null,
      };

      render(
        <MetricasConsolidadasCards
          metricas={metricasModoLivre}
          isModoLivre={true}
        />
      );

      // Card de Tempo indica Treino Livre
      expect(screen.getByText("Treino Livre")).toBeDefined();

      // Card de DDA exibe traço e badge de Inativo conforme RN01
      expect(screen.getByTestId("card-intervencoes-dda-valor").textContent).toBe(
        "--"
      );
      expect(screen.getByText("Inativo (Modo Livre)")).toBeDefined();
    });
  });

  describe("Tratamento de Indicadores Opcionais Ausentes", () => {
    it("deve exibir fallback amigável quando pontuação geral e foco forem nulos", () => {
      const metricasSemScore: MetricasConsolidadasDados = {
        duracaoSegundos: 300,
        taxaConclusao: 100,
        intervencoesDda: 0,
        pontuacaoGeral: null,
        estabilidadeFoco: null,
      };

      render(<MetricasConsolidadasCards metricas={metricasSemScore} />);

      // Pontuação Geral nula
      expect(screen.getByTestId("card-pontuacao-geral-valor").textContent).toBe(
        "--"
      );
      expect(screen.getByText("Não Aplicável")).toBeDefined();

      // Foco nulo
      expect(screen.getByTestId("card-estabilidade-foco-valor").textContent).toBe(
        "--"
      );
      expect(screen.getByText("Não Avaliado")).toBeDefined();

      // DDA zerado em sessão clínica
      expect(screen.getByText("Sem ajustes")).toBeDefined();
    });
  });
});
