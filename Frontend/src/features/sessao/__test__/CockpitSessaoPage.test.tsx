import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CockpitSessaoPage } from "../pages/CockpitSessaoPage";
import { useSessionStore } from "../store/sessionStore";
import { sessaoService } from "../services/sessaoService";
import { toast } from "sonner";

// Mock Sonner
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do useNavigate do react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "sessao-teste-123" }),
  };
});

describe("Card 3.4 — Testes do Cockpit de Monitoramento da Sessão (Hermeson Alves)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    useSessionStore.getState().reset();
  });

  const montarAmbienteSessaoAtiva = () => {
    act(() => {
      useSessionStore.getState().abrirModalPreSessao({
        id: "jogo-aventura",
        titulo: "Aventura das Cores",
      });
      useSessionStore.getState().selecionarPaciente({
        id: "pac-hermeson",
        nome: "Hermeson Alves",
      });
      useSessionStore.getState().iniciarPareamento({
        sessionToken: "849 - 291",
      });
      useSessionStore.getState().confirmarConexaoDispositivo({
        deviceId: "tab-clinico",
        modelo: "Galaxy Tab S9 FE+",
        bateria: 95,
        latenciaMs: 34,
        conectadoEm: new Date().toISOString(),
      });
      useSessionStore.getState().iniciarIntervencao();
    });
  };

  it("deve renderizar o Cockpit com identificação do paciente, jogo e cronômetro ativo", () => {
    montarAmbienteSessaoAtiva();

    render(
      <BrowserRouter>
        <CockpitSessaoPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId("cockpit-sessao-page")).toBeDefined();
    expect(screen.getByTestId("cockpit-paciente-nome").textContent).toBe("Hermeson Alves");
    expect(screen.getByTestId("cockpit-jogo-titulo").textContent).toBe("Aventura das Cores");
    expect(screen.getByTestId("cronometro-sessao")).toBeDefined();
    expect(screen.getByTestId("status-sessao-badge").textContent).toBe("Em Andamento");
  });

  it("deve alternar entre pausa e retomada disparando toasts e atualizando a store", () => {
    montarAmbienteSessaoAtiva();

    render(
      <BrowserRouter>
        <CockpitSessaoPage />
      </BrowserRouter>
    );

    const botaoPausar = screen.getByTestId("botao-pausar");
    fireEvent.click(botaoPausar);

    expect(useSessionStore.getState().isPausado).toBe(true);
    expect(toast.info).toHaveBeenCalledWith("Comando de pausa enviado ao jogo remoto.");

    // Agora deve exibir o botão de Retomar
    const botaoRetomar = screen.getByTestId("botao-retomar");
    fireEvent.click(botaoRetomar);

    expect(useSessionStore.getState().isPausado).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Intervenção retomada no dispositivo.");
  });

  it("deve abrir o modal de finalização, preencher anotações e encerrar a sessão", async () => {
    montarAmbienteSessaoAtiva();

    render(
      <BrowserRouter>
        <CockpitSessaoPage />
      </BrowserRouter>
    );

    // Clica para finalizar
    const botaoFinalizar = screen.getByTestId("botao-finalizar-sessao");
    fireEvent.click(botaoFinalizar);

    // Modal aberto
    expect(screen.getByTestId("modal-finalizar-sessao")).toBeDefined();

    // Digita observações clínicas preliminares
    const textarea = screen.getByTestId("textarea-anotacoes-clinicas");
    fireEvent.change(textarea, {
      target: { value: "Excelente resposta ao reforço positivo." },
    });

    // Confirma encerramento
    const spyFinalizarRest = vi.spyOn(sessaoService, "finalizar").mockResolvedValue({
      sucesso: true,
    });

    const btnConfirmar = screen.getByTestId("botao-confirmar-finalizacao");
    await act(async () => {
      fireEvent.click(btnConfirmar);
    });

    expect(spyFinalizarRest).toHaveBeenCalledWith(
      "sessao-teste-123",
      "Excelente resposta ao reforço positivo."
    );
    expect(useSessionStore.getState().status).toBe("finalizada");
    expect(useSessionStore.getState().anotacoesClinicas).toBe(
      "Excelente resposta ao reforço positivo."
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Sessão finalizada com sucesso! Prontuário atualizado."
    );
    expect(mockNavigate).toHaveBeenCalledWith("/games");
  });
});
