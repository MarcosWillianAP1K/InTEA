import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ModalPreSessao } from "../components/ModalPreSessao";
import { useSessionStore } from "../store/sessionStore";
import { toast } from "sonner";

// Mock do Sonner
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock da clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe("Card 4.4 — Testes de Componentes e Validação no Vitest (ModalPreSessao)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
  });

  it("não deve renderizar conteúdo se a configuração da sessão for nula", () => {
    const { container } = render(<ModalPreSessao />);
    expect(container.firstChild).toBeNull();
  });

  it("deve renderizar a etapa inicial de configuração com título e ID do jogo", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-calmo-1",
        titulo: "Formas Calmas",
      });
    });

    render(<ModalPreSessao />);

    expect(screen.getByText("Configuração Pré-Sessão Clínica")).toBeDefined();
    expect(screen.getByTestId("sessao-jogo-titulo").textContent).toBe("Formas Calmas");
    expect(screen.getByTestId("sessao-jogo-id").textContent).toContain("jogo-calmo-1");
    expect(screen.getByText("Paciente Atendido")).toBeDefined();
    expect(screen.getByText("Duração Estimada")).toBeDefined();
    expect(screen.getByText("Gatilhos a Evitar no DDA (RN03)")).toBeDefined();
  });

  it("deve manter o botão de avançar desabilitado até que um paciente seja selecionado", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
    });

    render(<ModalPreSessao />);

    const botaoAvancar = screen.getByRole("button", {
      name: /Gerar Código de Pareamento/i,
    });
    expect((botaoAvancar as HTMLButtonElement).disabled).toBe(true);

    // Seleciona um paciente no dropdown
    const select = screen.getByTestId("select-paciente");
    fireEvent.change(select, { target: { value: "pac-001" } }); // ID do primeiro paciente do mock

    // Agora o botão deve estar habilitado
    expect((botaoAvancar as HTMLButtonElement).disabled).toBe(false);
  });

  it("deve permitir configurar a duração planejada e alternar gatilhos sensoriais (RN03)", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
    });

    render(<ModalPreSessao />);

    // Seleciona duração de 30 min
    const botao30min = screen.getByRole("button", { name: "30 min" });
    fireEvent.click(botao30min);

    expect(useSessionStore.getState().config?.duracaoPlanejadaMinutos).toBe(30);

    // Alterna gatilho "Luzes estroboscópicas"
    const gatilhoLuzes = screen.getByRole("button", { name: /\+ Luzes estroboscópicas/i });
    fireEvent.click(gatilhoLuzes);

    expect(
      useSessionStore.getState().config?.gatilhosEvitar,
    ).toContain("Luzes estroboscópicas");
  });

  it("deve avançar para a tela de pareamento remoto com PIN gerado", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
    });

    render(<ModalPreSessao />);

    // Seleciona paciente
    const select = screen.getByTestId("select-paciente");
    fireEvent.change(select, { target: { value: "pac-001" } });

    // Clica em Gerar Código de Pareamento
    const botaoAvancar = screen.getByRole("button", {
      name: /Gerar Código de Pareamento/i,
    });
    fireEvent.click(botaoAvancar);

    // Valida transição de estado da store
    const state = useSessionStore.getState();
    expect(state.status).toBe("aguardando_pareamento");
    expect(state.pareamento?.sessionToken).toMatch(/^TEA-[A-Z0-9]{4}$/);

    // Valida elementos visuais da tela de Pareamento
    expect(screen.getByText("Pareamento Remoto da Sessão")).toBeDefined();
    expect(screen.getByTestId("pin-display")).toBeDefined();
    expect(screen.getByText("Aguardando Conexão do Tablet/VR...")).toBeDefined();
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining("PIN de pareamento gerado:"),
    );
  });

  it("deve permitir copiar o PIN de pareamento para o clipboard com feedback", async () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({
        sessionToken: "TEA-9999",
        tempoValidadeSegundos: 900,
      });
    });

    render(<ModalPreSessao />);

    expect(screen.getByText("TEA-9999")).toBeDefined();

    const botaoCopiar = screen.getByTitle("Copiar Código");
    await act(async () => {
      fireEvent.click(botaoCopiar);
    });

    expect(mockWriteText).toHaveBeenCalledWith("TEA-9999");
    expect(toast.success).toHaveBeenCalledWith("Código de pareamento copiado!");
  });

  it("deve atualizar reativamente a UI e liberar o botão de iniciar intervenção quando dispositivo conectar", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({
        sessionToken: "TEA-4321",
        tempoValidadeSegundos: 900,
      });
    });

    render(<ModalPreSessao />);

    const botaoIniciar = screen.getByRole("button", {
      name: /Iniciar Intervenção Clínica/i,
    });
    expect((botaoIniciar as HTMLButtonElement).disabled).toBe(true);

    // Simula recepção de evento de dispositivo conectado via store
    act(() => {
      useSessionStore.getState().confirmarConexaoDispositivo({
        deviceId: "tablet-samsung-s9",
        modelo: "Galaxy Tab S9 FE+",
        resolucao: "2560x1600",
        sistemaOperacional: "Android 14",
        bateria: 88,
        ipOrigem: "192.168.1.105",
      });
    });

    // O status muda para pareado
    expect(useSessionStore.getState().status).toBe("pareado");

    // UI atualiza exibindo detalhes do tablet
    expect(screen.getByText("Dispositivo Pareado com Sucesso!")).toBeDefined();
    expect(screen.getByText(/Galaxy Tab S9 FE\+/i)).toBeDefined();
    expect(screen.getByText(/88%/i)).toBeDefined();

    // Botão é liberado
    expect((botaoIniciar as HTMLButtonElement).disabled).toBe(false);

    // Clica para iniciar intervenção
    fireEvent.click(botaoIniciar);

    expect(useSessionStore.getState().status).toBe("em_andamento");
    expect(toast.success).toHaveBeenCalledWith(
      'Intervenção clínica iniciada com "Aventura das Cores"!',
    );
  });

  it("deve cancelar a sessão, notificar o terapeuta e resetar o estado ao clicar em Cancelar", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({
        sessionToken: "TEA-1234",
        tempoValidadeSegundos: 900,
      });
    });

    render(<ModalPreSessao />);

    const botaoCancelar = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(botaoCancelar);

    const state = useSessionStore.getState();
    expect(state.status).toBe("cancelada");
    expect(state.isModalAberto).toBe(false);
    expect(toast.info).toHaveBeenCalledWith("Configuração de sessão cancelada.");
  });
});
