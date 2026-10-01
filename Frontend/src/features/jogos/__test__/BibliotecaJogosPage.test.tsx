import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BibliotecaJogosPage } from "../pages/BibliotecaJogosPage";
import { useSessionStore } from "@/features/sessao";
import { toast } from "sonner";
import type { ReactNode } from "react";

// Mock do DashboardLayout para isolar o teste da página
vi.mock("@/layout/dashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock do Sonner para verificar feedbacks visuais sem poluir a saída
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("Card 4.3 — Integração do Fluxo 'Iniciar Sessão' na Biblioteca de Jogos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
  });

  it("deve carregar e renderizar os cards de jogos disponíveis na biblioteca", async () => {
    render(<BibliotecaJogosPage />);

    // Aguarda o término do loading e exibição do card
    await waitFor(() => {
      expect(screen.getByText("Aventura das Cores")).toBeDefined();
      expect(screen.getByText("Formas Calmas")).toBeDefined();
    });
  });

  it("deve abrir o modal de pré-sessão com o ID e título do jogo ao clicar em 'Iniciar Sessão'", async () => {
    render(<BibliotecaJogosPage />);

    await waitFor(() => {
      expect(screen.getByText("Aventura das Cores")).toBeDefined();
    });

    // Localiza todos os botões de Iniciar Sessão e clica no primeiro
    const botoesIniciar = screen.getAllByRole("button", { name: /Iniciar Sessão/i });
    expect(botoesIniciar.length).toBeGreaterThan(0);

    fireEvent.click(botoesIniciar[0]);

    // Valida que o modal foi aberto na store com o jogo correspondente
    const state = useSessionStore.getState();
    expect(state.isModalAberto).toBe(true);
    expect(state.config?.jogoId).toBe("jogo-1");
    expect(state.config?.jogoTitulo).toBe("Aventura das Cores");
    expect(state.status).toBe("configurando");

    // Valida o feedback do toast
    expect(toast.info).toHaveBeenCalledWith(
      'Configurando sessão clínica para "Aventura das Cores"',
    );
  });

  it("deve executar o 'Modo Livre' de forma independente sem abrir modal ou gravar sessão (RN01 / RF11)", async () => {
    render(<BibliotecaJogosPage />);

    await waitFor(() => {
      expect(screen.getByText("Aventura das Cores")).toBeDefined();
    });

    // Localiza botões de Modo Livre
    const botoesModoLivre = screen.getAllByRole("button", { name: /Modo Livre/i });
    expect(botoesModoLivre.length).toBeGreaterThan(0);

    fireEvent.click(botoesModoLivre[0]);

    // O modal NÃO deve ser aberto e nenhuma configuração de sessão clínica deve ser instanciada
    const state = useSessionStore.getState();
    expect(state.isModalAberto).toBe(false);
    expect(state.config).toBeNull();
    expect(state.status).toBe("ocioso");

    // Valida notificação informativa do Modo Livre
    expect(toast.info).toHaveBeenCalledWith(
      '"Aventura das Cores" aberto em Modo Livre (sem gravação de prontuário)',
    );
  });

  it("deve permitir configurar outro jogo sucessivamente atualizando o contexto do modal", async () => {
    render(<BibliotecaJogosPage />);

    await waitFor(() => {
      expect(screen.getByText("Formas Calmas")).toBeDefined();
    });

    const botoesIniciar = screen.getAllByRole("button", { name: /Iniciar Sessão/i });
    
    // Clica no segundo jogo ("Formas Calmas")
    fireEvent.click(botoesIniciar[1]);

    const state = useSessionStore.getState();
    expect(state.isModalAberto).toBe(true);
    expect(state.config?.jogoId).toBe("jogo-2");
    expect(state.config?.jogoTitulo).toBe("Formas Calmas");
  });
});
