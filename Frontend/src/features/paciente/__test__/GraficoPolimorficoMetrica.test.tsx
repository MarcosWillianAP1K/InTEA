import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardsEngajamentoGeral, formatarTempoSegundos } from "../components/CardsEngajamentoGeral";
import { GraficoPolimorficoMetrica } from "../components/GraficoPolimorficoMetrica";
import { GraficoLinhaTemporal } from "../components/GraficoLinhaTemporal";
import { GraficoBarrasCategorico } from "../components/GraficoBarrasCategorico";
import { IndicadorBooleanoMetrica } from "../components/IndicadorBooleanoMetrica";
import { GraficoEvolucaoJogo } from "../components/GraficoEvolucaoJogo";
import {
  MOCK_HISTORICO_ENGAJAMENTO_GERAL,
  MOCK_HISTORICO_ENGAJAMENTO_BAIXA_ADESAO,
  MOCK_SERIE_NUMERICA,
  MOCK_SERIE_CATEGORICA,
  MOCK_SERIE_ORDINAL,
  MOCK_SERIE_BOOLEANA,
  MOCK_SERIE_INVALIDA_RN02,
  MOCK_HISTORICO_JOGO_COMPLETO,
} from "../types/bdmock";
import type { SerieMetricaJogo } from "../types/historico.types";

describe("Sprint 11 — Componentes de Engajamento Global e Gráficos de Métricas (RF15, RN01, RN02, RNF04, RNF07)", () => {
  // ==========================================================================
  // 1. TESTES DE CardsEngajamentoGeral
  // ==========================================================================
  describe("CardsEngajamentoGeral — Panorama Universal do Paciente (RF15)", () => {
    it("deve renderizar cards com taxa >= 80% e badge verde de boa aderência", () => {
      render(<CardsEngajamentoGeral engajamento={MOCK_HISTORICO_ENGAJAMENTO_GERAL} />);

      expect(screen.getByTestId("cards-engajamento-geral")).toBeDefined();
      expect(screen.getByTestId("valor-taxa-conclusao").textContent).toContain("83.3%");

      const badgeAderencia = screen.getByTestId("badge-aderencia");
      expect(badgeAderencia.textContent).toContain("Boa Aderência (≥80%)");

      // Detalhamento de sessões finalizadas
      expect(screen.getByText(/10 de 12 sessões finalizadas/i)).toBeDefined();

      // Tempo total (16200s = 4h 30m)
      expect(screen.getByTestId("valor-tempo-total").textContent).toBe("4h 30m");

      // Tempo médio (1350s = 22m 30s)
      expect(screen.getByTestId("valor-tempo-medio").textContent).toBe("22m 30s");

      // Desfechos
      expect(screen.getByTestId("valor-desfechos").textContent).toContain("10");
      expect(screen.getByText(/10 concluídas/i)).toBeDefined();
      expect(screen.getByText(/2 interrupções/i)).toBeDefined();
    });

    it("deve renderizar badge âmbar de atenção quando taxa de conclusão < 80%", () => {
      render(<CardsEngajamentoGeral engajamento={MOCK_HISTORICO_ENGAJAMENTO_BAIXA_ADESAO} />);

      const badgeAderencia = screen.getByTestId("badge-aderencia");
      expect(badgeAderencia.textContent).toContain("Atenção (<80%)");
      expect(screen.getByTestId("valor-taxa-conclusao").textContent).toContain("60.0%");
    });

    it("deve renderizar loading state estrutural (zero CLS) quando isLoading for true", () => {
      render(<CardsEngajamentoGeral isLoading={true} />);
      expect(screen.getByTestId("cards-engajamento-skeleton")).toBeDefined();
    });

    it("deve renderizar empty state quando engajamento for nulo ou sem sessões", () => {
      render(<CardsEngajamentoGeral engajamento={null} />);
      expect(screen.getByTestId("cards-engajamento-empty")).toBeDefined();
      expect(screen.getByText(/Nenhuma Sessão Clínica Registrada/i)).toBeDefined();
    });

    it("formatarTempoSegundos deve converter unidades de tempo corretamente", () => {
      expect(formatarTempoSegundos(0)).toBe("0 min");
      expect(formatarTempoSegundos(45)).toBe("45s");
      expect(formatarTempoSegundos(600)).toBe("10 min");
      expect(formatarTempoSegundos(1350)).toBe("22m 30s");
      expect(formatarTempoSegundos(7200)).toBe("2h");
      expect(formatarTempoSegundos(16200)).toBe("4h 30m");
    });
  });

  // ==========================================================================
  // 2. TESTES DE GraficoLinhaTemporal (Métricas Numéricas)
  // ==========================================================================
  describe("GraficoLinhaTemporal — Métricas Numéricas Contínuas", () => {
    it("deve renderizar gráfico em SVG nativo com traçado e pontos para série numérica", () => {
      render(<GraficoLinhaTemporal serie={MOCK_SERIE_NUMERICA} />);

      const svg = screen.getByTestId("grafico-linha-svg");
      expect(svg).toBeDefined();
      expect(svg.getAttribute("role")).toBe("img");
      expect(svg.getAttribute("aria-label")).toContain("Tempo de Reação Motora");

      // Deve renderizar média calculada
      expect(screen.getByText(/Média:/i)).toBeDefined();

      // Hitboxes interativas de 44x44px (RNF07)
      const hitbox0 = screen.getByTestId("hitbox-ponto-0");
      expect(hitbox0).toBeDefined();
      expect(hitbox0.getAttribute("width")).toBe("44");
      expect(hitbox0.getAttribute("height")).toBe("44");

      // Interação de hover exibe tooltip
      fireEvent.mouseEnter(hitbox0);
      expect(screen.getByTestId("tooltip-ponto-linha")).toBeDefined();
      expect(screen.getByTestId("tooltip-ponto-linha").textContent).toContain("850.0 ms");
    });

    it("deve renderizar loading state e empty state no GraficoLinhaTemporal", () => {
      const { unmount } = render(<GraficoLinhaTemporal serie={MOCK_SERIE_NUMERICA} isLoading={true} />);
      expect(screen.getByTestId("grafico-linha-skeleton")).toBeDefined();
      unmount();

      const serieVazia: SerieMetricaJogo = {
        ...MOCK_SERIE_NUMERICA,
        pontos: [],
      };
      render(<GraficoLinhaTemporal serie={serieVazia} />);
      expect(screen.getByTestId("grafico-linha-empty")).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. TESTES DE GraficoBarrasCategorico (Métricas Categóricas e Ordinais)
  // ==========================================================================
  describe("GraficoBarrasCategorico — Métricas Categóricas e Ordinais", () => {
    it("deve renderizar barras em SVG nativo e legenda para métrica categórica", () => {
      render(<GraficoBarrasCategorico serie={MOCK_SERIE_CATEGORICA} />);

      const svg = screen.getByTestId("grafico-barras-svg");
      expect(svg).toBeDefined();
      expect(svg.getAttribute("role")).toBe("img");

      // Barra e hitbox
      expect(screen.getByTestId("barra-svg-0")).toBeDefined();
      const hitbox0 = screen.getByTestId("hitbox-barra-0");
      expect(hitbox0).toBeDefined();

      // Hover exibe tooltip
      fireEvent.mouseEnter(hitbox0);
      expect(screen.getByTestId("tooltip-ponto-barras")).toBeDefined();
      expect(screen.getByTestId("tooltip-ponto-barras").textContent).toContain("Disperso");
    });

    it("deve renderizar barras para série ordinal com badge 'Ordinal'", () => {
      render(<GraficoBarrasCategorico serie={MOCK_SERIE_ORDINAL} />);
      expect(screen.getByText("Ordinal")).toBeDefined();
    });

    it("deve renderizar loading e empty state em GraficoBarrasCategorico", () => {
      const { unmount } = render(<GraficoBarrasCategorico serie={MOCK_SERIE_CATEGORICA} isLoading={true} />);
      expect(screen.getByTestId("grafico-barras-skeleton")).toBeDefined();
      unmount();

      const serieVazia: SerieMetricaJogo = {
        ...MOCK_SERIE_CATEGORICA,
        pontos: [],
      };
      render(<GraficoBarrasCategorico serie={serieVazia} />);
      expect(screen.getByTestId("grafico-barras-empty")).toBeDefined();
    });
  });

  // ==========================================================================
  // 4. TESTES DE IndicadorBooleanoMetrica (Métricas Booleanas)
  // ==========================================================================
  describe("IndicadorBooleanoMetrica — Linha do Tempo Booleana Discreta", () => {
    it("deve renderizar timeline discreta em SVG com contagem de ocorrências", () => {
      render(<IndicadorBooleanoMetrica serie={MOCK_SERIE_BOOLEANA} />);

      const svg = screen.getByTestId("indicador-booleano-svg");
      expect(svg).toBeDefined();
      expect(svg.getAttribute("role")).toBe("img");

      // Ocorrências (3 de 5)
      expect(screen.getByText(/3 de 5/i)).toBeDefined();

      // Hover exibe tooltip
      const hitbox2 = screen.getByTestId("hitbox-booleana-2");
      fireEvent.mouseEnter(hitbox2);
      expect(screen.getByTestId("tooltip-ponto-booleano")).toBeDefined();
      expect(screen.getByTestId("tooltip-ponto-booleano").textContent).toContain("Sim (Ocorreu)");
    });

    it("deve renderizar loading e empty state em IndicadorBooleanoMetrica", () => {
      const { unmount } = render(<IndicadorBooleanoMetrica serie={MOCK_SERIE_BOOLEANA} isLoading={true} />);
      expect(screen.getByTestId("indicador-booleano-skeleton")).toBeDefined();
      unmount();

      const serieVazia: SerieMetricaJogo = {
        ...MOCK_SERIE_BOOLEANA,
        pontos: [],
      };
      render(<IndicadorBooleanoMetrica serie={serieVazia} />);
      expect(screen.getByTestId("indicador-booleano-empty")).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. TESTES DE GraficoPolimorficoMetrica & GARANTIA INVIOLÁVEL DA RN02
  // ==========================================================================
  describe("GraficoPolimorficoMetrica — Seleção Polimórfica e Bloqueio RN02", () => {
    it("deve selecionar GraficoLinhaTemporal para tipo_metrica === 'numerica'", () => {
      render(<GraficoPolimorficoMetrica serie={MOCK_SERIE_NUMERICA} />);
      expect(screen.getByTestId("grafico-linha-tempo_reacao_ms")).toBeDefined();
    });

    it("deve selecionar GraficoBarrasCategorico para tipo_metrica === 'categorica'", () => {
      render(<GraficoPolimorficoMetrica serie={MOCK_SERIE_CATEGORICA} />);
      expect(screen.getByTestId("grafico-barras-nivel_atencao")).toBeDefined();
    });

    it("deve selecionar GraficoBarrasCategorico para tipo_metrica === 'ordinal'", () => {
      render(<GraficoPolimorficoMetrica serie={MOCK_SERIE_ORDINAL} />);
      expect(screen.getByTestId("grafico-barras-estagio_desafio")).toBeDefined();
    });

    it("deve selecionar IndicadorBooleanoMetrica para tipo_metrica === 'booleana'", () => {
      render(<GraficoPolimorficoMetrica serie={MOCK_SERIE_BOOLEANA} />);
      expect(screen.getByTestId("indicador-booleano-concluiu_sem_ajuda")).toBeDefined();
    });

    it("RN02 MANDATÓRIA: deve REJEITAR fallback automático e renderizar Error State para tipo_metrica inválido", () => {
      render(<GraficoPolimorficoMetrica serie={MOCK_SERIE_INVALIDA_RN02} />);

      // Não deve renderizar gráfico de barras como fallback silencioso!
      expect(screen.queryByTestId("grafico-barras-metrica_sem_tipo_rn02")).toBeNull();
      expect(screen.queryByTestId("grafico-linha-metrica_sem_tipo_rn02")).toBeNull();

      // DEVE renderizar Error State controlado com badge de violação RN02
      expect(screen.getByTestId("error-state-rn02")).toBeDefined();
      expect(screen.getByTestId("badge-alerta-rn02").textContent).toContain("Violação RN02");
      expect(screen.getByText(/Inconsistência de Tipagem Clínica \(RN02\)/i)).toBeDefined();
      expect(screen.getByText(/Bloqueio de Fallback Automático Mandatório/i)).toBeDefined();
    });

    it("RN02 MANDATÓRIA: deve rejeitar tipo_metrica vazio ou nulo", () => {
      const serieSemTipo: SerieMetricaJogo = {
        id_metrica: "sem_tipo",
        tipo_metrica: "",
        pontos: [{ sessao_id: "s1", data_hora: "2026-10-01T00:00:00Z", valor: 10 }],
      };

      render(<GraficoPolimorficoMetrica serie={serieSemTipo} />);
      expect(screen.getByTestId("error-state-rn02")).toBeDefined();
    });

    it("deve renderizar loading e empty state em GraficoPolimorficoMetrica", () => {
      const { unmount } = render(<GraficoPolimorficoMetrica serie={MOCK_SERIE_NUMERICA} isLoading={true} />);
      expect(screen.getByTestId("grafico-polimorfico-skeleton")).toBeDefined();
      unmount();

      const serieVazia: SerieMetricaJogo = {
        ...MOCK_SERIE_NUMERICA,
        pontos: [],
      };
      render(<GraficoPolimorficoMetrica serie={serieVazia} />);
      expect(screen.getByTestId("grafico-polimorfico-empty")).toBeDefined();
    });
  });

  // ==========================================================================
  // 6. TESTES DE GraficoEvolucaoJogo
  // ==========================================================================
  describe("GraficoEvolucaoJogo — Container Orquestrador por Jogo", () => {
    it("deve renderizar cabeçalho do jogo e suas 4 métricas homologadas", () => {
      render(<GraficoEvolucaoJogo historicoJogo={MOCK_HISTORICO_JOGO_COMPLETO} />);

      expect(screen.getByTestId("grafico-evolucao-jogo")).toBeDefined();
      expect(screen.getByText("Aventuras na Floresta")).toBeDefined();
      expect(screen.getByText("v1.2.0")).toBeDefined();
      expect(screen.getByTestId("badge-total-sessoes-jogo").textContent).toContain("5 sessões");
      expect(screen.getByTestId("badge-total-metricas-jogo").textContent).toContain("4 métricas homologadas");

      // Todas as 4 métricas devem ser renderizadas simultaneamente no modo padrão
      expect(screen.getByTestId("grafico-linha-tempo_reacao_ms")).toBeDefined();
      expect(screen.getByTestId("grafico-barras-nivel_atencao")).toBeDefined();
      expect(screen.getByTestId("grafico-barras-estagio_desafio")).toBeDefined();
      expect(screen.getByTestId("indicador-booleano-concluiu_sem_ajuda")).toBeDefined();
    });

    it("deve permitir filtrar e exibir apenas uma métrica ao clicar na tab correspondente", () => {
      render(<GraficoEvolucaoJogo historicoJogo={MOCK_HISTORICO_JOGO_COMPLETO} />);

      const tabTempo = screen.getByTestId("tab-metrica-tempo_reacao_ms");
      fireEvent.click(tabTempo);

      // Apenas a métrica selecionada deve ser exibida
      expect(screen.getByTestId("grafico-linha-tempo_reacao_ms")).toBeDefined();
      expect(screen.queryByTestId("grafico-barras-nivel_atencao")).toBeNull();

      // Voltar para todas
      const tabTodas = screen.getByTestId("tab-metrica-todas");
      fireEvent.click(tabTodas);
      expect(screen.getByTestId("grafico-barras-nivel_atencao")).toBeDefined();
    });

    it("deve renderizar loading state e empty state no GraficoEvolucaoJogo", () => {
      const { unmount } = render(<GraficoEvolucaoJogo isLoading={true} />);
      expect(screen.getByTestId("grafico-evolucao-skeleton")).toBeDefined();
      unmount();

      render(<GraficoEvolucaoJogo historicoJogo={null} nomeJogo="Jogo Desconhecido" />);
      expect(screen.getByTestId("grafico-evolucao-empty")).toBeDefined();
      expect(screen.getByText(/Sem Sessões com “Jogo Desconhecido”/i)).toBeDefined();
    });
  });
});
