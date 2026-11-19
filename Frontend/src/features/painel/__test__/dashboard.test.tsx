import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PainelPage } from "../pages/PainelPage";
import { dashboardService } from "../services/dashboard.service";
import { sessaoService } from "@/features/sessao";
import { usePacienteStore } from "@/features/paciente/store/paciente.store";
import { NavHeader } from "@/layout/components/nav-header";
import { NavProjects } from "@/layout/components/nav-projects";
import { NavUser } from "@/layout/components/nav-user";
import { SidebarProvider } from "@/shared/components/ui/sidebar";
import { LayoutDashboard, Gamepad2, Users, History } from "lucide-react";

describe("Dashboard Components", () => {
  it("deve renderizar o cabeçalho de navegação (NavHeader)", () => {
    render(
      <MemoryRouter>
        <SidebarProvider>
          <NavHeader />
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("InTEA")).toBeDefined();
    expect(screen.getByText("Clinical Orchestration")).toBeDefined();
  });

  it("deve renderizar os links do menu principal (NavProjects)", () => {
    const projects = [
      { name: "Dashboard", url: "/", icon: LayoutDashboard },
      { name: "Games", url: "/games", icon: Gamepad2 },
      { name: "Meus Pacientes", url: "/patients", icon: Users },
      { name: "Historico", url: "/history", icon: History },
    ];

    render(
      <MemoryRouter>
        <SidebarProvider>
          <NavProjects projects={projects} />
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Games")).toBeDefined();
    expect(screen.getByText("Meus Pacientes")).toBeDefined();
    expect(screen.getByText("Historico")).toBeDefined();
  });

  it("deve renderizar as informações do usuário (NavUser)", () => {
    const user = {
      name: "Dr. Marina Silva",
      email: "marina@intea.com.br",
      avatar: "/avatar.jpg",
    };

    render(
      <SidebarProvider>
        <NavUser user={user} />
      </SidebarProvider>
    );

    expect(screen.getByText("Dr. Marina Silva")).toBeDefined();
    expect(screen.getByText("marina@intea.com.br")).toBeDefined();
  });
});

describe("PainelPage — Finalização de Sessão antes de navegar para /resultado (W2-B)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    usePacienteStore.setState({ patients: {} });
  });

  it("deve chamar sessaoService.finalizar antes de navegar ao clicar em 'Concluir sessão'", async () => {
    vi.spyOn(dashboardService, "obterMetricas").mockResolvedValue({
      pacientesAtivos: 1,
      sessoesNoMes: 2,
      tempoMedioEngajamentoMinutos: 20,
      taxaRegulacaoDDA: 90,
      tempoTotalTerapiaMinutos: 40,
      variacaoSessoesPercentual: 0,
      variacaoPacientesPercentual: 0,
    });
    vi.spyOn(dashboardService, "listarSessoesRecentes").mockResolvedValue([
      {
        id: "s-painel-1",
        pacienteId: "p-1",
        pacienteNome: "Lucas Martins",
        jogoId: "j-1",
        jogoNome: "Aventura das Cores",
        dataHora: "2026-11-18T14:00:00.000Z",
        duracaoSegundos: 600,
        status: "em_andamento",
        nivelEstresseMedio: 2,
        engajamentoScore: 88,
        ddaIntervencoes: 1,
      },
    ]);
    vi.spyOn(dashboardService, "listarAlertas").mockResolvedValue([]);
    const spyFinalizar = vi.spyOn(sessaoService, "finalizar").mockResolvedValue({
      sucesso: true,
      data: {
        id: "s-painel-1",
        session_token: "123-456",
        status_sessao: "finalizada",
      },
    });

    render(
      <MemoryRouter initialEntries={["/painel"]}>
        <Routes>
          <Route path="/painel" element={<PainelPage />} />
          <Route
            path="/sessao/:id/resultado"
            element={<div data-testid="resultado-destino">Resultado</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    const btnConcluir = await screen.findByRole("button", {
      name: /Concluir sessão/i,
    });
    fireEvent.click(btnConcluir);

    await waitFor(() => {
      expect(spyFinalizar).toHaveBeenCalledWith("s-painel-1");
    });
    expect(await screen.findByTestId("resultado-destino")).toBeDefined();
  });

  it("não deve navegar para /resultado quando sessaoService.finalizar falhar", async () => {
    vi.spyOn(dashboardService, "obterMetricas").mockResolvedValue({
      pacientesAtivos: 1,
      sessoesNoMes: 1,
      tempoMedioEngajamentoMinutos: 15,
      taxaRegulacaoDDA: 80,
      tempoTotalTerapiaMinutos: 15,
      variacaoSessoesPercentual: 0,
      variacaoPacientesPercentual: 0,
    });
    vi.spyOn(dashboardService, "listarSessoesRecentes").mockResolvedValue([
      {
        id: "s-painel-err",
        pacienteId: "p-1",
        pacienteNome: "Lucas Martins",
        jogoId: "j-1",
        jogoNome: "Aventura das Cores",
        dataHora: "2026-11-18T14:00:00.000Z",
        duracaoSegundos: 300,
        status: "em_andamento",
        nivelEstresseMedio: 2,
        engajamentoScore: 80,
        ddaIntervencoes: 0,
      },
    ]);
    vi.spyOn(dashboardService, "listarAlertas").mockResolvedValue([]);
    vi.spyOn(sessaoService, "finalizar").mockResolvedValue({
      sucesso: false,
      error: "Erro simulado ao finalizar",
    });

    render(
      <MemoryRouter initialEntries={["/painel"]}>
        <Routes>
          <Route path="/painel" element={<PainelPage />} />
          <Route
            path="/sessao/:id/resultado"
            element={<div data-testid="resultado-destino">Resultado</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    const btnConcluir = await screen.findByRole("button", {
      name: /Concluir sessão/i,
    });
    fireEvent.click(btnConcluir);

    await waitFor(() => {
      expect(sessaoService.finalizar).toHaveBeenCalledWith("s-painel-err");
    });
    expect(screen.queryByTestId("resultado-destino")).toBeNull();
  });
});
