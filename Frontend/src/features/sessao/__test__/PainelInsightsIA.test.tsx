import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PainelInsightsIA,
  formatarNomeMetrica,
} from "../components/resultado/PainelInsightsIA";
import type { DadosIaRelatorio } from "../types";

describe("Card 4.3 — PainelInsightsIA (Front-end 2 — Luma Maiara)", () => {
  const dadosIaExemplo: DadosIaRelatorio = {
    token_sessao: "a1b2c3d4-token",
    duracao_segundos: 1200,
    resumo: {
      taxa_conclusao: 85.5,
      intervencoes_dda: 4,
    },
    analises_ia: [
      "O paciente demonstrou excelente regulação após os primeiros 5 minutos.",
      "Houve necessidade de redução de dificuldade em estímulos sonoros.",
    ],
    metricas_agregadas: [
      {
        id_metrica: "nivel_frustracao",
        valor_dominante: "baixo",
        tendencia: "estavel",
      },
      {
        id_metrica: "tempo_resposta",
        valor_dominante: "medio",
        tendencia: "decrescente",
      },
      {
        id_metrica: "estabilidade_atencional",
        valor_dominante: "alto",
        tendencia: "crescente",
      },
    ],
    recomendacoes_adaptativas: [
      "Iniciar a próxima sessão com volume sonoro reduzido em 30%.",
      "Priorizar fases com pistas visuais reforçadas.",
    ],
  };

  describe("Função utilitária formatarNomeMetrica", () => {
    it("deve converter identificador snake_case para Title Case legível", () => {
      expect(formatarNomeMetrica("nivel_frustracao")).toBe("Nivel Frustracao");
      expect(formatarNomeMetrica("tempo_resposta")).toBe("Tempo Resposta");
      expect(formatarNomeMetrica("")).toBe("");
    });
  });

  describe("Renderização de Estados Estruturais", () => {
    it("deve renderizar o estado de loading com Skeleton Loaders geométricos (zero CLS)", () => {
      render(<PainelInsightsIA isLoading={true} />);

      const skeleton = screen.getByTestId("painel-insights-ia-skeleton");
      expect(skeleton).toBeDefined();
    });

    it("deve renderizar o empty state amigável quando dados de IA forem nulos ou vazios", () => {
      render(<PainelInsightsIA dadosIa={null} isLoading={false} />);

      expect(screen.getByTestId("painel-insights-ia-empty")).toBeDefined();
      expect(
        screen.getByText("Nenhum Parecer de IA Registrado")
      ).toBeDefined();
    });
  });

  describe("Conformidade com RN01 (Modo Livre)", () => {
    it("deve renderizar empty state dedicado de Modo Livre com menção à RN01", () => {
      render(
        <PainelInsightsIA
          dadosIa={dadosIaExemplo}
          isModoLivre={true}
        />
      );

      expect(screen.getByTestId("painel-insights-ia-modo-livre")).toBeDefined();
      expect(
        screen.getByText("Síntese de IA Desativada em Modo Livre")
      ).toBeDefined();
      expect(screen.getByText("Modo Livre")).toBeDefined();
      expect(
        screen.getByText(/Partidas executadas em Modo Livre não associam prontuário/)
      ).toBeDefined();

      // Não deve exibir as análises reais
      expect(screen.queryByTestId("item-analise-ia-0")).toBeNull();
    });
  });

  describe("Exibição da Síntese Analítica do Contrato 4", () => {
    it("deve renderizar as observações contextuais da IA", () => {
      render(<PainelInsightsIA dadosIa={dadosIaExemplo} />);

      expect(screen.getByTestId("painel-insights-ia-container")).toBeDefined();
      expect(screen.getByText("Síntese Analítica do Agente de IA")).toBeDefined();
      expect(screen.getByText("Motor DDA Ativo")).toBeDefined();

      // Observações
      expect(screen.getByTestId("item-analise-ia-0").textContent).toContain(
        "excelente regulação"
      );
      expect(screen.getByTestId("item-analise-ia-1").textContent).toContain(
        "estímulos sonoros"
      );
    });

    it("deve exibir em destaque o alerta de modulação sensorial quando detectado", () => {
      render(<PainelInsightsIA dadosIa={dadosIaExemplo} />);

      const alerta = screen.getByTestId("alerta-sensorial-ia");
      expect(alerta).toBeDefined();
      expect(
        screen.getByText("Atenção Clínica: Modulação Sensorial Recomendada")
      ).toBeDefined();
    });

    it("deve renderizar métricas agregadas com tendências (Estável, Decrescente, Crescente)", () => {
      render(<PainelInsightsIA dadosIa={dadosIaExemplo} />);

      // Nível de Frustração (Estável, baixo)
      const metrica1 = screen.getByTestId("metrica-agregada-nivel_frustracao");
      expect(metrica1).toBeDefined();
      expect(metrica1.textContent).toContain("Estável");
      expect(metrica1.textContent).toContain("baixo");

      // Tempo de Resposta (Decrescente)
      const metrica2 = screen.getByTestId("metrica-agregada-tempo_resposta");
      expect(metrica2).toBeDefined();
      expect(metrica2.textContent).toContain("Decrescente");

      // Estabilidade Atencional (Crescente)
      const metrica3 = screen.getByTestId("metrica-agregada-estabilidade_atencional");
      expect(metrica3).toBeDefined();
      expect(metrica3.textContent).toContain("Crescente");
    });

    it("deve renderizar bloco de recomendações adaptativas quando fornecido", () => {
      render(<PainelInsightsIA dadosIa={dadosIaExemplo} />);

      const bloco = screen.getByTestId("bloco-recomendacoes-adaptativas");
      expect(bloco).toBeDefined();
      expect(
        screen.getByText("Sugestões Adaptativas para o Planejamento")
      ).toBeDefined();
      expect(
        screen.getByText(/Iniciar a próxima sessão com volume sonoro reduzido/)
      ).toBeDefined();
    });
  });
});
