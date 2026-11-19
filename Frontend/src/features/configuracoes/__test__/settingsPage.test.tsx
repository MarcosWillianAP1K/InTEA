import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "../pages/settingsPage";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import { pacienteService } from "@/features/paciente/services/paciente.service";
import { sessaoService } from "@/features/sessao/services/sessao.service";
import { jogosService } from "@/features/jogos/services/jogos.service";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("SettingsPage (Configurações e Perfil do Terapeuta)", () => {
  const usuarioBase = {
    id: "11111111-1111-4111-a111-111111111111",
    nome: "Dr. Marcos Willian",
    email: "marcos@intea.com.br",
    telefone: "(89) 99417-0000",
    crefito: "CREFITO-3/12345-TO",
    registro_profissional: "CREFITO-3/12345-TO",
    especialidade: "Terapia Ocupacional",
    clinica_id: "clinica-1",
    clinica_nome: "InTEA Saúde",
    is_super_admin: false,
    status_ativo: true,
    tempo_experiencia_anos: 5,
    role: "terapeuta" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: usuarioBase,
      isAuthenticated: true,
    });
    vi.spyOn(pacienteService, "listar").mockResolvedValue([]);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    vi.spyOn(jogosService, "listar").mockResolvedValue([]);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <SettingsPage />
        </ThemeProvider>
      </MemoryRouter>,
    );
  }

  it("não deve renderizar o selo 'Perfil Clínico Verificado'", () => {
    renderPage();
    expect(screen.queryByText(/Perfil Clínico Verificado/i)).toBeNull();
  });

  it("não deve alterar o card superior enquanto o usuário apenas digita sem salvar", () => {
    renderPage();
    const banner = screen.getByTestId("banner-perfil-terapeuta");
    expect(banner.textContent).toContain("Dr. Marcos Willian");
    expect(banner.textContent).toContain("Terapia Ocupacional");

    const inputNome = screen.getByLabelText(/Nome Completo/i);
    fireEvent.change(inputNome, { target: { value: "Nome Editado Sem Salvar" } });

    expect(banner.textContent).toContain("Dr. Marcos Willian");
    expect(banner.textContent).not.toContain("Nome Editado Sem Salvar");
  });

  it("deve bloquear envio quando telefone possuir 12 dígitos e exibir orientação", async () => {
    const spyAtualizar = vi.spyOn(terapeutaService, "atualizar");
    renderPage();

    const inputTelefone = screen.getByLabelText(/Telefone de Contato/i);
    fireEvent.change(inputTelefone, { target: { value: "899994659968" } });

    const btnSalvar = screen.getByRole("button", { name: /Salvar Alterações Pessoais/i });
    fireEvent.click(btnSalvar);

    expect(spyAtualizar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Telefone inválido/i));
    expect(screen.getByText(/Telefone inválido/i)).toBeDefined();
  });

  it("deve manter dados antigos no card e exibir erro amigável em timeout/cold start", async () => {
    const erroTimeout = Object.assign(new Error("Timeout"), { isTimeoutError: true });
    vi.spyOn(terapeutaService, "atualizar").mockRejectedValueOnce(erroTimeout);

    renderPage();
    const banner = screen.getByTestId("banner-perfil-terapeuta");

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: "Dr. Marcos Alterado" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Alterações Pessoais/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "servidor está iniciando ou demorou para responder",
      );
    });

    expect(banner.textContent).toContain("Dr. Marcos Willian");
    expect(banner.textContent).not.toContain("Dr. Marcos Alterado");
  });

  it("deve atualizar o card e a store somente após persistência bem-sucedida", async () => {
    vi.spyOn(terapeutaService, "atualizar").mockResolvedValueOnce({
      ...usuarioBase,
      nome: "Dr. Marcos Atualizado",
      telefone: "+55 (89) 99417-1234",
      especialidade: "Neuropsicologia",
      is_super_admin: false,
      status_ativo: true,
    });

    renderPage();
    const banner = screen.getByTestId("banner-perfil-terapeuta");

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), {
      target: { value: "Dr. Marcos Atualizado" },
    });
    fireEvent.change(screen.getByLabelText(/Telefone de Contato/i), {
      target: { value: "89994171234" },
    });
    fireEvent.change(screen.getByLabelText(/Especialidade/i), {
      target: { value: "Neuropsicologia" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Alterações Pessoais/i }));

    await waitFor(() => {
      expect(banner.textContent).toContain("Dr. Marcos Atualizado");
      expect(banner.textContent).toContain("Neuropsicologia");
    });

    expect(useAuthStore.getState().user?.nome).toBe("Dr. Marcos Atualizado");
    expect(toast.success).toHaveBeenCalled();
  });
});
