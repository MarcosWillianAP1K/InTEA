import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HistoricoPacientePage } from "../pages/HistoricoPacientePage";
import { SeletorJogoHistorico } from "../components/SeletorJogoHistorico";
import { FiltrosHistoricoAvancado } from "../components/FiltrosHistoricoAvancado";
import { LinhaDoTempoSessoes } from "../components/LinhaDoTempoSessoes";
import { pacienteService } from "../services/paciente.service";
import {
  MOCK_HISTORICO_ENGAJAMENTO_GERAL,
  MOCK_CATALOGO_JOGOS_PACIENTE,
  MOCK_HISTORICO_JOGO_COMPLETO,
} from "../types/bdmock";
import type { ResumoJogoPaciente, SessaoHistoricoItem } from "../types/historico.types";

// Mock do pacienteService para testes determinísticos
vi.mock("../services/paciente.service", () => ({
  pacienteService: {
    buscarPorId: vi.fn(),
    buscarHistorico: vi.fn(),
    buscarHistoricoGeral: vi.fn(),
    buscarHistoricoJogo: vi.fn(),
  },
}));

// Mock do sessionStore
vi.mock("@/features/sessao/store/sessionStore", () => ({
  useSessionStore: vi.fn((selector) =>
    selector({
      abrirModalPreSessao: vi.fn(),
      selecionarPaciente: vi.fn(),
    }),
  ),
}));

describe("Sprint 11 — Página Mestre e Componentes do Histórico do Paciente (RF15, RF19, RN04, RNF07)", () => {
  const pacienteMock = {
    id: "pac-001",
    nome: "Lucas Gabriel Ferreira",
    data_nascimento: "2018-04-12",
    telefone: "(86) 99876-5432",
    status_ativo: true,
    dados_clinicos: {
      id: "dc-001",
      paciente_id: "pac-001",
      diagnostico_base: "TEA Nível 2",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. TESTES ATÔMICOS: SeletorJogoHistorico
  // ==========================================================================
  describe("SeletorJogoHistorico (RF15, RNF07)", () => {
    it("deve renderizar skeleton quando isLoading=true", () => {
      render(
        <SeletorJogoHistorico
          jogos={[]}
          jogoSelecionadoId={null}
          onSelecionarJogo={vi.fn()}
          isLoading={true}
        />,
      );
      expect(screen.getByTestId("seletor-jogo-skeleton")).toBeDefined();
    });

    it("deve renderizar estado vazio amigável quando lista de jogos for vazia", () => {
      render(
        <SeletorJogoHistorico
          jogos={[]}
          jogoSelecionadoId={null}
          onSelecionarJogo={vi.fn()}
          isLoading={false}
        />,
      );
      expect(screen.getByTestId("seletor-jogo-vazio")).toBeDefined();
    });

    it("deve destacar Visão Geral quando jogoSelecionadoId for null e alternar jogos", () => {
      const handleSelect = vi.fn();
      render(
        <SeletorJogoHistorico
          jogos={MOCK_CATALOGO_JOGOS_PACIENTE}
          jogoSelecionadoId={null}
          onSelecionarJogo={handleSelect}
        />,
      );

      const btnVisaoGeral = screen.getByTestId("btn-visao-geral");
      expect(btnVisaoGeral.getAttribute("aria-pressed")).toBe("true");

      const btnJogo1 = screen.getByTestId(`btn-jogo-${MOCK_CATALOGO_JOGOS_PACIENTE[0].id}`);
      expect(btnJogo1.getAttribute("aria-pressed")).toBe("false");

      fireEvent.click(btnJogo1);
      expect(handleSelect).toHaveBeenCalledWith(String(MOCK_CATALOGO_JOGOS_PACIENTE[0].id));
    });

    it("deve possuir alvos de toque com min-height de 44px (RNF07)", () => {
      render(
        <SeletorJogoHistorico
          jogos={MOCK_CATALOGO_JOGOS_PACIENTE}
          jogoSelecionadoId={null}
          onSelecionarJogo={vi.fn()}
        />,
      );

      const btnVisaoGeral = screen.getByTestId("btn-visao-geral");
      expect(btnVisaoGeral.className).toContain("min-h-[44px]");
    });
  });

  // ==========================================================================
  // 2. TESTES ATÔMICOS: FiltrosHistoricoAvancado
  // ==========================================================================
  describe("FiltrosHistoricoAvancado (RF19, RNF07)", () => {
    it("deve renderizar os botões de período rápido com alvo >= 44px", () => {
      render(
        <FiltrosHistoricoAvancado
          filtros={{ periodo: "30d" }}
          onAlterarFiltros={vi.fn()}
        />,
      );

      const btn30d = screen.getByTestId("btn-periodo-30d");
      expect(btn30d.getAttribute("aria-pressed")).toBe("true");
      expect(btn30d.className).toContain("min-h-[44px]");

      const btn7d = screen.getByTestId("btn-periodo-7d");
      expect(btn7d.getAttribute("aria-pressed")).toBe("false");
    });

    it("deve disparar recálculo ao clicar em 7 dias", () => {
      const handleAlterar = vi.fn();
      render(
        <FiltrosHistoricoAvancado
          filtros={{ periodo: "30d" }}
          onAlterarFiltros={handleAlterar}
        />,
      );

      fireEvent.click(screen.getByTestId("btn-periodo-7d"));
      expect(handleAlterar).toHaveBeenCalledTimes(1);
      const callArg = handleAlterar.mock.calls[0][0];
      expect(callArg.periodo).toBe("7d");
      expect(callArg.dataInicio).toBeDefined();
      expect(callArg.dataFim).toBeDefined();
    });

    it("deve exibir painel de datas quando período for personalizado", () => {
      const handleAlterar = vi.fn();
      render(
        <FiltrosHistoricoAvancado
          filtros={{ periodo: "personalizado" }}
          onAlterarFiltros={handleAlterar}
        />,
      );

      expect(screen.getByTestId("painel-intervalo-personalizado")).toBeDefined();
      const inputInicio = screen.getByTestId("input-data-inicio");
      const inputFim = screen.getByTestId("input-data-fim");

      fireEvent.change(inputInicio, { target: { value: "2026-09-01" } });
      fireEvent.change(inputFim, { target: { value: "2026-09-30" } });

      fireEvent.click(screen.getByTestId("btn-aplicar-datas"));
      expect(handleAlterar).toHaveBeenCalledWith(
        expect.objectContaining({
          periodo: "personalizado",
          dataInicio: "2026-09-01",
          dataFim: "2026-09-30",
        }),
      );
    });
  });

  // ==========================================================================
  // 3. TESTES ATÔMICOS: LinhaDoTempoSessoes
  // ==========================================================================
  describe("LinhaDoTempoSessoes (RF15, RN01, RNF07)", () => {
    const sessoesMock: SessaoHistoricoItem[] = [
      {
        sessao_id: "sess-abc-01",
        status_sessao: "finalizada",
        data_hora_fim: "2026-10-18T15:30:00Z",
        tempo_total_segundos: 1200,
        terapeuta_id: "ter-9999",
      },
      {
        sessao_id: "sess-abc-02",
        status_sessao: "interrompida",
        data_hora_fim: "2026-10-14T10:00:00Z",
        tempo_total_segundos: 450,
      },
    ];

    it("deve renderizar skeleton quando isLoading=true", () => {
      render(<MemoryRouter><LinhaDoTempoSessoes sessoes={[]} isLoading={true} /></MemoryRouter>);
      expect(screen.getByTestId("linha-do-tempo-skeleton")).toBeDefined();
    });

    it("deve renderizar estado vazio quando não houver sessões", () => {
      render(<MemoryRouter><LinhaDoTempoSessoes sessoes={[]} isLoading={false} /></MemoryRouter>);
      expect(screen.getByTestId("linha-do-tempo-vazia")).toBeDefined();
    });

    it("deve exibir badges semânticos Verde (Concluída) e Âmbar (Interrompida)", () => {
      render(<MemoryRouter><LinhaDoTempoSessoes sessoes={sessoesMock} /></MemoryRouter>);

      expect(screen.getByTestId("badge-status-concluida")).toBeDefined();
      expect(screen.getByTestId("badge-status-interrompida")).toBeDefined();
    });

    it("deve possuir botão de relatório com alvo mínimo de 44px (RNF07)", () => {
      const handleNav = vi.fn();
      render(
        <MemoryRouter>
          <LinhaDoTempoSessoes
            sessoes={sessoesMock}
            onNavegarResultado={handleNav}
          />
        </MemoryRouter>,
      );

      const btnRelatorio = screen.getByTestId("btn-ver-relatorio-sess-abc-01");
      expect(btnRelatorio.className).toContain("min-h-[44px]");

      fireEvent.click(btnRelatorio);
      expect(handleNav).toHaveBeenCalledWith("sess-abc-01");
    });
  });

  // ==========================================================================
  // 4. TESTES DA PÁGINA MESTRE: HistoricoPacientePage
  // ==========================================================================
  describe("HistoricoPacientePage — Fluxo Completo da Tela (RF15, RF19, RN04)", () => {
    it("deve carregar dados e renderizar cabeçalho, cards de engajamento e linha do tempo", async () => {
      vi.mocked(pacienteService.buscarPorId).mockResolvedValue(pacienteMock as any);
      vi.mocked(pacienteService.buscarHistoricoGeral).mockResolvedValue({
        engajamento: MOCK_HISTORICO_ENGAJAMENTO_GERAL,
        jogos: MOCK_CATALOGO_JOGOS_PACIENTE,
      });
      vi.mocked(pacienteService.buscarHistorico).mockResolvedValue({
        paciente_id: "pac-001",
        engajamento_geral: MOCK_HISTORICO_ENGAJAMENTO_GERAL,
        historico_por_jogo: {
          tipo: "detalhado",
          jogo: MOCK_HISTORICO_JOGO_COMPLETO.jogo,
          sessoes: MOCK_HISTORICO_JOGO_COMPLETO.sessoes,
          series_temporais: MOCK_HISTORICO_JOGO_COMPLETO.series_temporais,
        },
      });

      render(
        <MemoryRouter initialEntries={["/pacientes/pac-001/historico"]}>
          <Routes>
            <Route path="/pacientes/:id/historico" element={<HistoricoPacientePage />} />
          </Routes>
        </MemoryRouter>,
      );

      // Aguarda carregamento
      await waitFor(() => {
        expect(screen.getByTestId("titulo-paciente-historico").textContent).toContain(
          "Lucas Gabriel Ferreira",
        );
      });

      // Valida diagnóstico e prontuário
      expect(screen.getByText("TEA Nível 2")).toBeDefined();
      expect(screen.getByText(/Prontuário #pac-001/i)).toBeDefined();

      // Valida presença dos componentes filhos
      expect(screen.getByTestId("cards-engajamento-geral")).toBeDefined();
      expect(screen.getByTestId("seletor-jogo-historico")).toBeDefined();
      expect(screen.getByTestId("filtros-historico-avancado")).toBeDefined();
      expect(screen.getByTestId("linha-do-tempo-sessoes")).toBeDefined();
    });

    it("deve exibir tela de erro 403 Forbidden quando terapeuta não possui vínculo ativo (RN04)", async () => {
      vi.mocked(pacienteService.buscarPorId).mockResolvedValue(pacienteMock as any);
      vi.mocked(pacienteService.buscarHistoricoGeral).mockRejectedValue({
        response: {
          status: 403,
          data: { error: "Terapeuta não possui vínculo com este paciente na clínica." },
        },
      });

      render(
        <MemoryRouter initialEntries={["/pacientes/pac-001/historico"]}>
          <Routes>
            <Route path="/pacientes/:id/historico" element={<HistoricoPacientePage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("estado-erro-403")).toBeDefined();
      });

      expect(screen.getByText(/Acesso Negado ao Histórico Clínico \(RN04\)/i)).toBeDefined();
    });

    it("deve alternar para visualização de jogo específico ao clicar no seletor", async () => {
      vi.mocked(pacienteService.buscarPorId).mockResolvedValue(pacienteMock as any);
      vi.mocked(pacienteService.buscarHistoricoGeral).mockResolvedValue({
        engajamento: MOCK_HISTORICO_ENGAJAMENTO_GERAL,
        jogos: MOCK_CATALOGO_JOGOS_PACIENTE,
      });
      vi.mocked(pacienteService.buscarHistorico).mockResolvedValue({
        paciente_id: "pac-001",
        engajamento_geral: MOCK_HISTORICO_ENGAJAMENTO_GERAL,
        historico_por_jogo: {
          tipo: "detalhado",
          jogo: MOCK_HISTORICO_JOGO_COMPLETO.jogo,
          sessoes: MOCK_HISTORICO_JOGO_COMPLETO.sessoes,
          series_temporais: MOCK_HISTORICO_JOGO_COMPLETO.series_temporais,
        },
      });
      vi.mocked(pacienteService.buscarHistoricoJogo).mockResolvedValue(
        MOCK_HISTORICO_JOGO_COMPLETO,
      );

      render(
        <MemoryRouter initialEntries={["/pacientes/pac-001/historico"]}>
          <Routes>
            <Route path="/pacientes/:id/historico" element={<HistoricoPacientePage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("btn-jogo-jogo-floresta-01")).toBeDefined();
      });

      // Clica no jogo 1 ("Aventuras na Floresta")
      fireEvent.click(screen.getByTestId("btn-jogo-jogo-floresta-01"));

      await waitFor(() => {
        expect(pacienteService.buscarHistoricoJogo).toHaveBeenCalledWith(
          "pac-001",
          "jogo-floresta-01",
          expect.any(Object),
        );
      });
    });
  });
});
