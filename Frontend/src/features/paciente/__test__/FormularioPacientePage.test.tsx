import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { FormularioPacientePage } from "../pages/FormularioPacientePage";
import { pacienteService } from "../services/paciente.service";
import { clinicaAdminService } from "@/features/admin/services/clinicaAdmin.service";
import { usePacienteStore } from "../store/paciente.store";
import type { Paciente } from "../types/paciente.types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

describe("FormularioPacientePage (/pacientes/cadastrar e /pacientes/:id/editar)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePacienteStore.setState({ patients: {}, selectedPatientId: null });
    vi.spyOn(clinicaAdminService, "listar").mockResolvedValue([
      { id: "cli-1", nome: "Clínica Alpha", status_ativo: true },
      { id: "cli-2", nome: "Clínica Beta", status_ativo: true },
    ]);
  });

  it("deve renderizar página de criação com seletor de clínica visível e condição habilitada sem exigir laudo", async () => {
    const spyCriar = vi.spyOn(pacienteService, "criar").mockResolvedValue({
      id: "pac-novo-1",
      clinica_id: "cli-1",
      nome: "Lucas Gabriel Teste",
      data_nascimento: "2018-05-14",
      cpf: "529.982.247-25",
      estado: "PI",
      numero: "420",
      status_ativo: true,
      created_at: "2026-11-18T10:00:00.000Z",
      updated_at: "2026-11-18T10:00:00.000Z",
      dados_clinicos: {
        id: "dc-1",
        paciente_id: "pac-novo-1",
        diagnostico_base: "TEA nível 1",
        gatilhos_sensoriais: [],
      },
    });

    render(
      <MemoryRouter initialEntries={["/pacientes/cadastrar"]}>
        <Routes>
          <Route path="/pacientes/cadastrar" element={<FormularioPacientePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Cadastrar Novo Paciente" }),
    ).toBeDefined();

    // Select de clínica e condição clínica existem e não estão bloqueados por laudo
    const selectClinica = screen.getByTestId("select-clinica-paciente") as HTMLButtonElement;
    expect(selectClinica).toBeDefined();
    const selectCondicao = screen.getByTestId("select-condicao-clinica") as HTMLButtonElement;
    expect(selectCondicao.disabled).toBe(false);

    // Seleciona Clínica Beta
    fireEvent.click(selectClinica);
    fireEvent.click(await screen.findByRole("option", { name: "Clínica Beta" }));

    // Seleciona condição TEA nível 1 sem enviar laudo
    fireEvent.click(selectCondicao);
    fireEvent.click(await screen.findByRole("option", { name: "TEA nível 1" }));

    fireEvent.change(screen.getAllByPlaceholderText("Nome completo")[0], {
      target: { value: "Lucas Gabriel Teste" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("DD/MM/AAAA")[0], {
      target: { value: "14/05/2018" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("000.000.000-00")[0], {
      target: { value: "52998224725" },
    });

    // Responsável principal com estado próprio (corrigindo antigo bug setRespExtraState)
    fireEvent.change(screen.getByPlaceholderText("Nome do responsável"), {
      target: { value: "Maria Responsável" },
    });
    fireEvent.change(screen.getByLabelText("Estado do responsável"), {
      target: { value: "PI" },
    });

    fireEvent.click(screen.getByTestId("btn-submit-paciente"));

    await waitFor(() => {
      expect(spyCriar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Lucas Gabriel Teste",
          clinica_id: "cli-2",
          data_nascimento: "2018-05-14",
          responsavel: expect.objectContaining({
            nome: "Maria Responsável",
            estado: "PI",
          }),
          dados_clinicos: expect.objectContaining({
            diagnostico_base: "TEA nível 1",
          }),
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/pacientes/pac-novo-1");
  });

  it("deve preencher campos no modo edição preservando ID do responsável sem CPF e submeter PUT", async () => {
    const pacienteExistente: Paciente = {
      id: "11111111-1111-4111-8111-111111111111",
      clinica_id: "cli-1",
      nome: "Sofia Editável",
      data_nascimento: "2017-03-10",
      cpf: "529.982.247-25",
      cidade: "Teresina",
      estado: "PI",
      numero: "100",
      status_ativo: true,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
      responsaveis: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          nome: "Carlos Pai",
          telefone: "(86) 99999-1111",
          estado: "PI",
          principal: true,
          tipo_responsavel: "principal",
        },
      ],
      dados_clinicos: {
        id: "33333333-3333-4333-8333-333333333333",
        paciente_id: "11111111-1111-4111-8111-111111111111",
        diagnostico_base: "Dislexia",
        gatilhos_sensoriais: ["Luzes piscantes"],
      },
    };

    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(pacienteExistente);
    const spyAtualizar = vi
      .spyOn(pacienteService, "atualizar")
      .mockResolvedValue({ ...pacienteExistente, nome: "Sofia Atualizada" });

    render(
      <MemoryRouter initialEntries={["/pacientes/11111111-1111-4111-8111-111111111111/editar"]}>
        <Routes>
          <Route path="/pacientes/:id/editar" element={<FormularioPacientePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Editar Cadastro do Paciente" }),
    ).toBeDefined();

    const inputNome = screen.getByDisplayValue("Sofia Editável");
    fireEvent.change(inputNome, { target: { value: "Sofia Atualizada" } });

    fireEvent.click(screen.getByTestId("btn-submit-paciente"));

    await waitFor(() => {
      expect(spyAtualizar).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        expect.objectContaining({
          nome: "Sofia Atualizada",
          clinica_id: "cli-1",
          responsavel: expect.objectContaining({
            id: "22222222-2222-4222-8222-222222222222",
            nome: "Carlos Pai",
          }),
          dados_clinicos: expect.objectContaining({
            diagnostico_base: "Dislexia",
            gatilhos_sensoriais: ["Luzes piscantes"],
          }),
        }),
      );
    });
  });

  it("deve exibir estado de erro se o paciente não existir no modo edição", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/pacientes/id-inexistente/editar"]}>
        <Routes>
          <Route path="/pacientes/:id/editar" element={<FormularioPacientePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("formulario-paciente-erro")).toBeDefined();
    expect(screen.getByText("Paciente não encontrado para edição.")).toBeDefined();
  });
});
