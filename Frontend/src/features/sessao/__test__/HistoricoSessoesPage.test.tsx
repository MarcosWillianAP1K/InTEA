import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HistoricoSessoesPage } from "../pages/HistoricoSessoesPage";
import { sessaoService } from "../services/sessao.service";
import type { Sessao } from "../types/sessao.types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

function criarSessaoMock(overrides: Partial<Sessao>): Sessao {
  return {
    id: "sessao-base",
    terapeuta_id: "terap-1",
    paciente_id: "pac-1",
    jogo_id: "jogo-1",
    session_token: "123-456",
    modo_sessao: "sessao_clinica",
    status_sessao: "finalizada",
    duracao_segundos: 900,
    data_hora_inicio: "2026-11-18T14:00:00.000Z",
    paciente: { id: "pac-1", nome: "Lucas Silva" },
    jogo: { id: "jogo-1", titulo: "Aventura das Cores" },
    ...overrides,
  };
}

describe("HistoricoSessoesPage (W1-B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve exibir o título 'Histórico de Sessões' e exibir 'Ver Relatório' apenas para sessões concluídas", async () => {
    const sessoes: Sessao[] = [
      criarSessaoMock({
        id: "s-finalizada",
        status_sessao: "finalizada",
        paciente: { id: "p-1", nome: "Paciente Finalizado" },
      }),
      criarSessaoMock({
        id: "s-concluida",
        status_sessao: "concluida",
        paciente: { id: "p-2", nome: "Paciente Concluído" },
      }),
      criarSessaoMock({
        id: "s-cancelada",
        status_sessao: "cancelada",
        paciente: { id: "p-3", nome: "Paciente Cancelado" },
      }),
      criarSessaoMock({
        id: "s-expirada",
        status_sessao: "expirada",
        paciente: { id: "p-4", nome: "Paciente Expirado" },
      }),
      criarSessaoMock({
        id: "s-interrompida",
        status_sessao: "interrompida",
        paciente: { id: "p-5", nome: "Paciente Interrompido" },
      }),
      criarSessaoMock({
        id: "s-andamento",
        status_sessao: "em_andamento",
        paciente: { id: "p-6", nome: "Paciente Andamento" },
      }),
      criarSessaoMock({
        id: "s-conectado",
        status_sessao: "conectado",
        paciente: { id: "p-7", nome: "Paciente Conectado" },
      }),
      criarSessaoMock({
        id: "s-pausada",
        status_sessao: "pausada",
        paciente: { id: "p-8", nome: "Paciente Pausado" },
      }),
    ];

    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: sessoes,
      meta: { total: sessoes.length, page: 1, limit: 15, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <HistoricoSessoesPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Histórico de Sessões" })
    ).toBeDefined();
    expect(screen.queryByText(/Registro de Atendimentos/i)).toBeNull();

    await waitFor(() => {
      expect(screen.getByText("Paciente Finalizado")).toBeDefined();
    });

    // Apenas 2 sessões (finalizada e concluida) devem exibir "Ver Relatório"
    const botoesRelatorio = screen.getAllByRole("button", { name: /Ver Relatório/i });
    expect(botoesRelatorio).toHaveLength(2);

    // Apenas 3 sessões ativas (em_andamento, conectado, pausada) devem exibir "Cockpit"
    const botoesCockpit = screen.getAllByRole("button", { name: /Cockpit/i });
    expect(botoesCockpit).toHaveLength(3);

    // Sessões cancelada, expirada e interrompida mostram marcador indisponível e navegações corretas
    expect(screen.getAllByLabelText("Relatório indisponível")).toHaveLength(3);

    fireEvent.click(botoesRelatorio[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/sessao/s-finalizada/resultado");

    fireEvent.click(botoesCockpit[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/sessao/s-andamento/monitoramento");
  });

  it("não deve exibir 'Ver Relatório' para sessão aguardando_pareamento ao listar pendentes", async () => {
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: [
        criarSessaoMock({
          id: "s-aguardando",
          status_sessao: "aguardando_pareamento",
          paciente: { id: "p-9", nome: "Paciente Aguardando" },
        }),
      ],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <HistoricoSessoesPage />
      </MemoryRouter>
    );

    // Por padrão, statusFiltro='todas' suprime aguardando_pareamento
    await waitFor(() => {
      expect(sessaoService.listar).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: /Ver Relatório/i })).toBeNull();
  });
});
