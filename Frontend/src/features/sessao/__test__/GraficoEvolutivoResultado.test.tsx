import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GraficoEvolutivoResultado } from "../components/resultado/GraficoEvolutivoResultado";
import type { TentativaRespostaPonto } from "../types";

describe("Card 4.2 — GraficoEvolutivoResultado (Front-end 2 — Luma Maiara)", () => {
  const tentativasExemplo: TentativaRespostaPonto[] = [
    {
      tentativa: 1,
      tempoFormatado: "00:30",
      segundo: 30,
      tempoRespostaSegundos: 3.5,
      acerto: true,
      intervencaoDda: null,
    },
    {
      tentativa: 2,
      tempoFormatado: "01:10",
      segundo: 70,
      tempoRespostaSegundos: 4.8,
      acerto: false,
      intervencaoDda: null,
    },
    {
      tentativa: 3,
      tempoFormatado: "02:00",
      segundo: 120,
      tempoRespostaSegundos: 5.2,
      acerto: false,
      intervencaoDda: {
        momentoFormatado: "02:00",
        segundo: 120,
        tipoIntervencao: "Redução de Dificuldade",
        detalhes: "Estímulos desacelerados",
      },
    },
    {
      tentativa: 4,
      tempoFormatado: "02:45",
      segundo: 165,
      tempoRespostaSegundos: 2.1,
      acerto: true,
      intervencaoDda: null,
    },
    {
      tentativa: 5,
      tempoFormatado: "03:30",
      segundo: 210,
      tempoRespostaSegundos: 1.8,
      acerto: true,
      intervencaoDda: null,
    },
  ];

  describe("Renderização de Estados Estruturais", () => {
    it("deve renderizar o estado de loading com Skeleton Loaders geométricos (zero CLS)", () => {
      render(<GraficoEvolutivoResultado isLoading={true} />);

      const skeletonContainer = screen.getByTestId("grafico-evolutivo-skeleton");
      expect(skeletonContainer).toBeDefined();
    });

    it("deve renderizar o empty state amigável quando tentativas forem vazias ou nulas", () => {
      render(<GraficoEvolutivoResultado tentativas={[]} isLoading={false} />);

      expect(screen.getByTestId("grafico-evolutivo-empty")).toBeDefined();
      expect(
        screen.getByText("Tentativas Temporais Insuficientes")
      ).toBeDefined();
      expect(
        screen.getByText(/Não foram registradas tentativas ou eventos/)
      ).toBeDefined();
    });
  });

  describe("Renderização Vetorial do Gráfico SVG", () => {
    it("deve renderizar o SVG com viewBox e eixos com base nas tentativas fornecidas", () => {
      render(
        <GraficoEvolutivoResultado
          tentativas={tentativasExemplo}
          tempoMedioReferencia={3.48}
        />
      );

      const svg = screen.getByTestId("grafico-evolutivo-svg");
      expect(svg).toBeDefined();

      // Linha de média clínica deve estar presente
      expect(screen.getByTestId("linha-tempo-medio")).toBeDefined();
      expect(screen.getByText(/Média \(3.48s\)/)).toBeDefined();

      // Todos os 5 pontos de tentativa devem ser renderizados
      expect(screen.getByTestId("ponto-tentativa-1")).toBeDefined();
      expect(screen.getByTestId("ponto-tentativa-2")).toBeDefined();
      expect(screen.getByTestId("ponto-tentativa-3")).toBeDefined();
      expect(screen.getByTestId("ponto-tentativa-4")).toBeDefined();
      expect(screen.getByTestId("ponto-tentativa-5")).toBeDefined();
    });

    it("deve destacar marcadores visuais de intervenção DDA no instante exato", () => {
      render(<GraficoEvolutivoResultado tentativas={tentativasExemplo} />);

      // A tentativa 3 (índice 2) possui modulação DDA
      expect(screen.getByTestId("marcador-dda-2")).toBeDefined();
      expect(screen.getByText("1 Modulação DDA")).toBeDefined();
    });

    it("deve exibir a legenda do gráfico com indicadores de Acerto, Erro, DDA e Média", () => {
      render(<GraficoEvolutivoResultado tentativas={tentativasExemplo} />);

      const legenda = screen.getByTestId("grafico-legenda");
      expect(legenda).toBeDefined();
      expect(screen.getByText("Acerto")).toBeDefined();
      expect(screen.getByText("Erro")).toBeDefined();
      expect(screen.getByText("Intervenção DDA")).toBeDefined();
      expect(screen.getByText("Média da Sessão")).toBeDefined();
    });
  });

  describe("Interatividade e Detalhe de Tentativas (Tooltip/Hover)", () => {
    it("deve exibir detalhes da tentativa ao clicar ou passar o mouse em um ponto", () => {
      render(<GraficoEvolutivoResultado tentativas={tentativasExemplo} />);

      const ponto3 = screen.getByTestId("ponto-tentativa-3");
      fireEvent.mouseEnter(ponto3);

      const tooltip = screen.getByTestId("tooltip-ponto-ativo");
      expect(tooltip).toBeDefined();
      expect(screen.getByText(/Tentativa #3/)).toBeDefined();
      expect(screen.getByText("5.20s")).toBeDefined();
      expect(
        screen.getByText(/Redução de Dificuldade: Estímulos desacelerados/)
      ).toBeDefined();

      // Ao retirar o mouse, o tooltip fecha
      fireEvent.mouseLeave(ponto3);
      expect(screen.queryByTestId("tooltip-ponto-ativo")).toBeNull();
    });
  });

  describe("Conformidade com RN01 (Modo Livre)", () => {
    it("deve omitir marcadores de DDA e exibir badge informativo quando isModoLivre for true", () => {
      render(
        <GraficoEvolutivoResultado
          tentativas={tentativasExemplo}
          isModoLivre={true}
        />
      );

      // Badge de Modo Livre em destaque
      expect(screen.getByText("Modo Livre: Sem DDA (RN01)")).toBeDefined();

      // Marcadores de DDA não devem ser renderizados
      expect(screen.queryByTestId("marcador-dda-2")).toBeNull();
      expect(screen.queryByText(/Modulação DDA/)).toBeNull();
    });
  });
});
