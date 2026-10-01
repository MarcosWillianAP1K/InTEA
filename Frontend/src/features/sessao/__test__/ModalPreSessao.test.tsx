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

  it("deve renderizar a tela de configuração pré-sessão com Contexto DDA e Pareamento Remoto", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-calmo-1",
        titulo: "Formas Calmas",
      });
    });

    render(<ModalPreSessao />);

    expect(screen.getByText("Configuração Pré-Sessão")).toBeDefined();
    expect(screen.getByText("Ajuste os parâmetros DDA antes de iniciar a intervenção.")).toBeDefined();
    expect(screen.getByText("Contexto DDA")).toBeDefined();
    expect(screen.getByText("Nível de Estresse Inicial")).toBeDefined();
    expect(screen.getByText("Gatilhos a Evitar")).toBeDefined();
    expect(screen.getByText("Pareamento Remoto")).toBeDefined();
    expect(screen.getByText("Código de Pareamento")).toBeDefined();
  });

  it("deve permitir alterar o nível de estresse e alternar gatilhos a evitar", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
    });

    render(<ModalPreSessao />);

    expect(screen.getByTestId("valor-estresse").textContent).toBe("1");

    // Alterna gatilho "Pressão de Tempo"
    const gatilhoPressao = screen.getByRole("button", { name: /Pressão de Tempo/i });
    fireEvent.click(gatilhoPressao);

    expect(useSessionStore.getState().config?.gatilhosEvitar).toContain("Pressão de Tempo");

    // Desativa gatilho "Som Alto"
    const gatilhoSom = screen.getByRole("button", { name: /Som Alto/i });
    fireEvent.click(gatilhoSom);

    expect(useSessionStore.getState().config?.gatilhosEvitar).not.toContain("Som Alto");
  });

  it("deve permitir copiar o PIN de pareamento para o clipboard com feedback", async () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({
        sessionToken: "849 - 291",
        tempoValidadeSegundos: 900,
      });
    });

    render(<ModalPreSessao />);

    expect(screen.getByText("849 - 291")).toBeDefined();

    const botaoCopiar = screen.getByTitle("Copiar Código");
    await act(async () => {
      fireEvent.click(botaoCopiar);
    });

    expect(mockWriteText).toHaveBeenCalledWith("849 - 291");
    expect(toast.success).toHaveBeenCalledWith("Código de pareamento copiado!");
  });

  it("deve atualizar reativamente a UI e liberar o botão de iniciar intervenção quando dispositivo conectar", () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-1",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().iniciarPareamento({
        sessionToken: "849 - 291",
        tempoValidadeSegundos: 900,
      });
    });

    render(<ModalPreSessao />);

    const botaoIniciar = screen.getByRole("button", {
      name: /Confirmar e Iniciar Intervenção/i,
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

    // UI atualiza exibindo sucesso
    expect(screen.getByText("Dispositivo Conectado com Sucesso!")).toBeDefined();

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
        sessionToken: "849 - 291",
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
