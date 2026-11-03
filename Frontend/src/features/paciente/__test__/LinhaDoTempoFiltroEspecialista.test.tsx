import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LinhaDoTempoSessoes } from "../components/LinhaDoTempoSessoes";
import { FiltrosHistoricoAvancado } from "../components/FiltrosHistoricoAvancado";
import type { SessaoHistoricoItem, EspecialistaHistorico, FiltrosHistorico } from "../types/historico.types";

/**
 * ============================================================================
 * TESTES UNITÁRIOS — Task #187 (Sprint 13)
 * Filtro por Especialista da Equipe na Linha do Tempo Longitudinal de Sessões
 * Conformidade: RF15, RF18 (Multi-terapeuta), RF19 (Filtros), RNF07 (Ergonomia)
 * ============================================================================
 */

const mockSessoes: SessaoHistoricoItem[] = [
  {
    sessao_id: "sessao-to-001",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-10-15T10:00:00.000Z",
    data_hora_fim: "2026-10-15T10:45:00.000Z",
    tempo_total_segundos: 2700,
    terapeuta_id: "terap-to-111",
    terapeuta_nome: "Dra. Beatriz Toledo",
    especialidade: "Terapia Ocupacional",
    jogo_id: "game-equilibrio",
  },
  {
    sessao_id: "sessao-fono-002",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-10-16T14:00:00.000Z",
    data_hora_fim: "2026-10-16T14:30:00.000Z",
    tempo_total_segundos: 1800,
    terapeuta_id: "terap-fono-222",
    terapeuta_nome: "Dr. Fábio Fonseca",
    especialidade: "Fonoaudiologia",
    jogo_id: "game-vocabulario",
  },
  {
    sessao_id: "sessao-psico-003",
    status_sessao: "em_andamento",
    data_hora_inicio: "2026-10-17T09:00:00.000Z",
    tempo_total_segundos: 1200,
    terapeuta_id: "terap-psico-333",
    terapeuta_nome: "Dra. Camila Ramos",
    especialidade: "Psicologia ABA",
    jogo_id: "game-atencao",
  },
  {
    sessao_id: "sessao-to-004",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-10-18T11:00:00.000Z",
    data_hora_fim: "2026-10-18T11:40:00.000Z",
    tempo_total_segundos: 2400,
    terapeuta_id: "terap-to-111",
    terapeuta_nome: "Dra. Beatriz Toledo",
    especialidade: "Terapia Ocupacional",
    jogo_id: "game-equilibrio",
  },
];

const mockEspecialistas: EspecialistaHistorico[] = [
  {
    id: "terap-to-111",
    nome: "Dra. Beatriz Toledo",
    especialidade: "Terapia Ocupacional",
  },
  {
    id: "terap-fono-222",
    nome: "Dr. Fábio Fonseca",
    especialidade: "Fonoaudiologia",
  },
  {
    id: "terap-psico-333",
    nome: "Dra. Camila Ramos",
    especialidade: "Psicologia ABA",
  },
];

describe("Task #187 — Filtro por Especialista Responsável na Linha do Tempo e Filtros Avançados", () => {
  describe("LinhaDoTempoSessoes — População Dinâmica e Filtragem Reativa", () => {
    it("deve extrair e popular dinamicamente os especialistas a partir das sessões fornecidas", () => {
      render(
        <MemoryRouter>
          <LinhaDoTempoSessoes sessoes={mockSessoes} />
        </MemoryRouter>,
      );

      const select = screen.getByTestId("select-filtro-especialista-timeline");
      expect(select).toBeDefined();

      // Verifica opção padrão
      expect(
        screen.getByRole("option", { name: /Todas as Sessões da Equipe Multidisciplinar/i }),
      ).toBeDefined();

      // Verifica opções extraídas dinamicamente de mockSessoes
      expect(
        screen.getByRole("option", { name: /Dra\. Beatriz Toledo • Terapia Ocupacional/i }),
      ).toBeDefined();
      expect(
        screen.getByRole("option", { name: /Dr\. Fábio Fonseca • Fonoaudiologia/i }),
      ).toBeDefined();
      expect(
        screen.getByRole("option", { name: /Dra\. Camila Ramos • Psicologia ABA/i }),
      ).toBeDefined();
    });

    it("deve filtrar reativamente as sessões exibidas ao selecionar um especialista na linha do tempo", () => {
      const handleFiltrar = vi.fn();
      render(
        <MemoryRouter>
          <LinhaDoTempoSessoes sessoes={mockSessoes} onFiltrarEspecialista={handleFiltrar} />
        </MemoryRouter>,
      );

      // Inicialmente exibe todas as 4 sessões
      expect(screen.getByTestId("card-sessao-sessao-to-001")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-fono-002")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-psico-003")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-to-004")).toBeDefined();

      // Seleciona Fonoaudiologia
      const select = screen.getByTestId("select-filtro-especialista-timeline");
      fireEvent.change(select, { target: { value: "terap-fono-222" } });

      expect(handleFiltrar).toHaveBeenCalledWith("terap-fono-222");

      // Deve exibir apenas a sessão do Fábio Fonseca
      expect(screen.getByTestId("card-sessao-sessao-fono-002")).toBeDefined();
      expect(screen.queryByTestId("card-sessao-sessao-to-001")).toBeNull();
      expect(screen.queryByTestId("card-sessao-sessao-psico-003")).toBeNull();
      expect(screen.queryByTestId("card-sessao-sessao-to-004")).toBeNull();
      expect(screen.getByText("1 sessão")).toBeDefined();
    });

    it("deve restaurar todas as sessões ao selecionar 'Todas as Sessões da Equipe Multidisciplinar'", () => {
      render(
        <MemoryRouter>
          <LinhaDoTempoSessoes sessoes={mockSessoes} especialistaFiltroId="terap-to-111" />
        </MemoryRouter>,
      );

      // Com filtro ativo na prop, exibe as 2 da Beatriz Toledo
      expect(screen.getByTestId("card-sessao-sessao-to-001")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-to-004")).toBeDefined();
      expect(screen.queryByTestId("card-sessao-sessao-fono-002")).toBeNull();

      // Troca para todas
      const select = screen.getByTestId("select-filtro-especialista-timeline");
      fireEvent.change(select, { target: { value: "" } });

      // Agora volta a exibir todas
      expect(screen.getByTestId("card-sessao-sessao-to-001")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-fono-002")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-psico-003")).toBeDefined();
      expect(screen.getByTestId("card-sessao-sessao-to-004")).toBeDefined();
    });

    it("deve exibir empty state específico quando não houver sessões para o especialista selecionado", () => {
      render(
        <MemoryRouter>
          <LinhaDoTempoSessoes
            sessoes={mockSessoes}
            especialistas={[
              ...mockEspecialistas,
              { id: "terap-neuro-999", nome: "Dr. Neurologista Sem Sessoes", especialidade: "Neurologia" },
            ]}
            especialistaFiltroId="terap-neuro-999"
          />
        </MemoryRouter>,
      );

      expect(screen.getByTestId("empty-state-especialista")).toBeDefined();
      expect(
        screen.getByText(/Nenhuma sessão encontrada para este especialista/i),
      ).toBeDefined();

      // Botão para limpar filtro no empty state
      const btnLimpar = screen.getByTestId("btn-limpar-filtro-especialista-timeline");
      expect(btnLimpar).toBeDefined();

      fireEvent.click(btnLimpar);

      // Volta a exibir todas
      expect(screen.queryByTestId("empty-state-especialista")).toBeNull();
      expect(screen.getByTestId("card-sessao-sessao-to-001")).toBeDefined();
    });

    it("deve renderizar os metadados do especialista no card da sessão", () => {
      render(
        <MemoryRouter>
          <LinhaDoTempoSessoes sessoes={mockSessoes} />
        </MemoryRouter>,
      );

      const infoBeatriz = screen.getByTestId("terapeuta-info-sessao-to-001");
      expect(infoBeatriz.textContent).toContain("Dra. Beatriz Toledo");
      expect(infoBeatriz.textContent).toContain("(Terapia Ocupacional)");

      const infoFabio = screen.getByTestId("terapeuta-info-sessao-fono-002");
      expect(infoFabio.textContent).toContain("Dr. Fábio Fonseca");
      expect(infoFabio.textContent).toContain("(Fonoaudiologia)");
    });
  });

  describe("FiltrosHistoricoAvancado — Seletor de Especialista e Preservação de Filtros (RF19)", () => {
    it("deve exibir o seletor de especialista quando especialistas forem passados via props", () => {
      const mockFiltros: FiltrosHistorico = {
        periodo: "30d",
        jogoId: "game-equilibrio",
      };
      const handleAlterar = vi.fn();

      render(
        <FiltrosHistoricoAvancado
          filtros={mockFiltros}
          especialistas={mockEspecialistas}
          onAlterarFiltros={handleAlterar}
        />,
      );

      const select = screen.getByTestId("select-filtro-especialista");
      expect(select).toBeDefined();

      expect(
        screen.getByRole("option", { name: /Todas as Sessões da Equipe Multidisciplinar/i }),
      ).toBeDefined();
      expect(
        screen.getByRole("option", { name: /Dra\. Beatriz Toledo \(Terapia Ocupacional\)/i }),
      ).toBeDefined();
    });

    it("deve disparar onAlterarFiltros preservando o período e jogo ao selecionar um especialista", () => {
      const mockFiltros: FiltrosHistorico = {
        periodo: "7d",
        jogoId: "game-equilibrio",
        dataInicio: "2026-10-01",
        dataFim: "2026-10-08",
      };
      const handleAlterar = vi.fn();

      render(
        <FiltrosHistoricoAvancado
          filtros={mockFiltros}
          especialistas={mockEspecialistas}
          onAlterarFiltros={handleAlterar}
        />,
      );

      const select = screen.getByTestId("select-filtro-especialista");
      fireEvent.change(select, { target: { value: "terap-to-111" } });

      expect(handleAlterar).toHaveBeenCalledWith({
        periodo: "7d",
        jogoId: "game-equilibrio",
        dataInicio: "2026-10-01",
        dataFim: "2026-10-08",
        terapeutaId: "terap-to-111",
      });
    });

    it("deve resetar o filtro de terapeutaId ao clicar em Restaurar Padrão", () => {
      const mockFiltros: FiltrosHistorico = {
        periodo: "30d",
        terapeutaId: "terap-fono-222",
      };
      const handleAlterar = vi.fn();

      render(
        <FiltrosHistoricoAvancado
          filtros={mockFiltros}
          especialistas={mockEspecialistas}
          onAlterarFiltros={handleAlterar}
        />,
      );

      const btnReset = screen.getByTestId("btn-resetar-filtros");
      expect(btnReset).toBeDefined();

      fireEvent.click(btnReset);

      expect(handleAlterar).toHaveBeenCalledWith(
        expect.objectContaining({
          periodo: "30d",
          terapeutaId: undefined,
        }),
      );
    });
  });
});

