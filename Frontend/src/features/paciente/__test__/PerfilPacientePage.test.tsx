import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PerfilPacientePage } from "../pages/PerfilPacientePage";
import { pacienteService } from "../services/paciente.service";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import type { Paciente } from "../types/paciente.types";
import type { Sessao } from "@/features/sessao/types/sessao.types";

const MOCK_PACIENTE: Paciente = {
  id: "paciente-uuid-1234",
  clinica_id: "clinica-uuid-9999",
  nome: "Arthur Vinícius Ramos",
  data_nascimento: "2017-06-15",
  cpf: "123.456.789-00",
  telefone: "(86) 99887-1122",
  endereco: "Rua das Camélias",
  numero: "150",
  cidade: "Teresina",
  estado: "PI",
  status_ativo: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  responsaveis: [
    {
      id: "resp-1",
            nome: "Juliana Ramos",
      parentesco: "Mãe",
      telefone: "(86) 99887-1122",
      email: "juliana@email.com",
      
    },
  ],
  terapeutas: [
    {
      terapeuta_id: "terapeuta-1",
      paciente_id: "paciente-uuid-1234",
      terapeuta: {
        id: "terapeuta-1",
        nome: "Dr. Hermeson Alves",
        especialidade: "Terapeuta Ocupacional",
        registro_profissional: "CREFITO 12345-TO",
      },
    },
  ],
};

const MOCK_SESSOES: Sessao[] = [
  {
    id: "sessao-uuid-101",
    clinica_id: "clinica-uuid-9999",
    paciente_id: "paciente-uuid-1234",
    terapeuta_id: "terapeuta-1",
    jogo_id: "jogo-uuid-1",
    modo_sessao: "sessao_clinica",
    session_token: "849-291",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-11-01T14:00:00Z",
    duracao_segundos: 1200,
    jogo: {
      id: "jogo-uuid-1",
      nome: "Labirinto das Emoções",
    },
  },
];

describe("Página: PerfilPacientePage (Prontuário e Equipe Multidisciplinar)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar os dados cadastrais e prontuário do paciente com sucesso", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(MOCK_PACIENTE);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: MOCK_SESSOES,
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(pacienteService, "listarTerapeutas").mockResolvedValue([
      {
        terapeuta_id: "terapeuta-1",
        paciente_id: "paciente-uuid-1234",
        terapeuta: {
          id: "terapeuta-1",
          nome: "Dr. Hermeson Alves",
          especialidade: "Terapeuta Ocupacional",
          crefito: "CREFITO 12345-TO",
        },
      },
    ]);
    vi.spyOn(terapeutaService, "listar").mockResolvedValue([]);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/pacientes/paciente-uuid-1234"]}>
          <Routes>
            <Route path="/pacientes/:id" element={<PerfilPacientePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText("Arthur Vinícius Ramos")).toBeDefined();
    expect(screen.getByText(/Prontuário: #paciente/i)).toBeDefined();
    expect(screen.getByText("Dados Básicos")).toBeDefined();
    expect(screen.getByText("Juliana Ramos")).toBeDefined();
    expect(screen.getByText("Labirinto das Emoções")).toBeDefined();
    expect(screen.getByTestId("painel-equipe-multidisciplinar")).toBeDefined();
  });

  it("deve renderizar estado amigável quando o paciente não é localizado", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(null);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    vi.spyOn(pacienteService, "listarTerapeutas").mockResolvedValue([]);
    vi.spyOn(terapeutaService, "listar").mockResolvedValue([]);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/pacientes/paciente-inexistente"]}>
          <Routes>
            <Route path="/pacientes/:id" element={<PerfilPacientePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText("Paciente não localizado")).toBeDefined();
    expect(screen.getByRole("button", { name: /Voltar para Pacientes/i })).toBeDefined();
  });

  it("deve permitir abrir o modal de vinculação de especialista da equipe multidisciplinar", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(MOCK_PACIENTE);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    vi.spyOn(pacienteService, "listarTerapeutas").mockResolvedValue([]);
    vi.spyOn(terapeutaService, "listar").mockResolvedValue([
      {
        id: "esp-2",
        nome: "Dra. Luma Psicóloga",
        email: "luma@intea.com",
        especialidade: "Psicóloga Comportamental",
        crefito: "CRP 02/9876",
        status_ativo: true,
        clinica_id: "clinica-uuid-9999",
        is_super_admin: false,
      },
    ]);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/pacientes/paciente-uuid-1234"]}>
          <Routes>
            <Route path="/pacientes/:id" element={<PerfilPacientePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const btnAdicionar = screen.getByTestId("btn-adicionar-especialista");
    expect(btnAdicionar).toBeDefined();

    await act(async () => {
      fireEvent.click(btnAdicionar);
    });

    expect(screen.getByTestId("modal-vincular-especialista")).toBeDefined();
    expect(screen.getByText("Vincular Especialista da Clínica")).toBeDefined();
  });
});
