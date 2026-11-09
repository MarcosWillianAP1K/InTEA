import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PerfilPacientePage } from "../pages/PerfilPacientePage";
import { pacienteService } from "../services/paciente.service";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
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
  bairro: "Ininga",
  cep: "64048-000",
  cidade: "Teresina",
  estado: "PI",
  status_ativo: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  terapeuta_responsavel_id: "terapeuta-1",
  responsaveis: [
    {
      id: "resp-1",
      nome: "Juliana Ramos",
      parentesco: "Mãe",
      cpf: "079.366.693-70",
      telefone: "(86) 99887-1122",
      email: "juliana@email.com",
      endereco: "Rua das Camélias",
      numero: "150",
      bairro: "Ininga",
      cep: "64048-000",
      cidade: "Teresina",
      estado: "PI",
    },
  ],
  terapeutas: [
    {
      terapeuta_id: "terapeuta-1",
      paciente_id: "paciente-uuid-1234",
      papel_equipe: "Especialista Responsável",
      terapeuta: {
        id: "terapeuta-1",
        nome: "Dr. Hermeson Alves",
        especialidade: "Terapeuta Ocupacional",
        registro_profissional: "CREFITO 12345-TO",
        status_ativo: true,
      },
    },
  ],
  dados_clinicos: {
    id: "dc-1",
    paciente_id: "paciente-uuid-1234",
    diagnostico_base: "CID-11: 6A02 (Transtorno do Espectro Autista)",
    observacoes_gerais: "Paciente com acompanhamento multidisciplinar ativo.",
    gatilhos_sensoriais: ["Sons Altos", "Luzes Fortes"],
  },
  gatilhos: [
    {
      paciente_id: "paciente-uuid-1234",
      gatilho_id: "gat-1",
      grau_severidade: "severo",
      observacoes: "Sensibilidade a sons repetitivos",
      gatilho: {
        id: "gat-1",
        nome: "Sons Repentinos",
        categoria: "sensorial",
      },
    },
  ],
  laudos: [
    {
      id: "laudo-1",
      paciente_id: "paciente-uuid-1234",
      terapeuta_id: "terapeuta-1",
      titulo: "Laudo Clínico Multidisciplinar",
      arquivo_caminho: "laudos/paciente-1234/laudo.pdf",
      arquivo_nome_original: "laudo_multidisciplinar.pdf",
      arquivo_mime_type: "application/pdf",
      tamanho_bytes: 204800,
      created_at: "2026-10-15T10:00:00Z",
      terapeuta: {
        id: "terapeuta-1",
        nome: "Dr. Hermeson Alves",
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

describe("Página: PerfilPacientePage (Prontuário e Equipe Especialista)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: "terapeuta-1",
        nome: "Dr. Hermeson Alves",
        email: "hermeson@intea.com",
        is_super_admin: true,
        role: "super_admin",
        tempo_experiencia_anos: 10,
        areas_foco: ["TEA"],
        clinica_id: "clinica-uuid-9999",
        status_ativo: true,
      },
      isAuthenticated: true,
    });
  });

  it("deve renderizar os dados cadastrais, 5 seções estruturadas e prontuário do paciente com sucesso", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(MOCK_PACIENTE);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: MOCK_SESSOES,
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([
      {
        id: "terapeuta-1",
        nome: "Dr. Hermeson Alves",
        especialidade: "Terapeuta Ocupacional",
        crefito: "CREFITO 12345-TO",
        status_ativo: true,
        eh_responsavel: true,
        papel_equipe: "Especialista Responsável",
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

    // Identificação Geral e Avatar
    expect(screen.getByText("Arthur Vinícius Ramos")).toBeDefined();
    expect(screen.getByText(/Prontuário: #paciente/i)).toBeDefined();
    const avatar = screen.getByTestId("avatar-perfil-paciente");
    expect(avatar).toBeDefined();
    expect(avatar.textContent).toContain("AV");

    // 5 Seções Contínuas
    expect(screen.getByTestId("secao-visao-geral")).toBeDefined();
    expect(screen.getByTestId("secao-equipe")).toBeDefined();
    expect(screen.getByTestId("secao-prontuario")).toBeDefined();
    expect(screen.getByTestId("secao-anotacoes")).toBeDefined();
    expect(screen.getByTestId("secao-sessoes")).toBeDefined();

    // Responsável com dados completos
    expect(screen.getByText("Juliana Ramos")).toBeDefined();
    expect(screen.getByText("079.366.693-70")).toBeDefined();

    // Laudo Clínico e Gatilhos
    expect(screen.getByTestId("card-laudo-clinico")).toBeDefined();
    expect(screen.getByTestId("btn-baixar-laudo-pdf")).toBeDefined();
    expect(screen.getByTestId("card-gatilhos-paciente")).toBeDefined();

    // Sessões
    expect(screen.getByText("Labirinto das Emoções")).toBeDefined();
  });

  it("deve renderizar estado amigável quando o paciente não é localizado", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(null);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([]);
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

  it("deve permitir abrir o modal de vinculação de especialista quando usuário for líder ou superadmin", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(MOCK_PACIENTE);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([
      {
        id: "terapeuta-1",
        nome: "Dr. Hermeson Alves",
        especialidade: "Terapeuta Ocupacional",
        crefito: "CREFITO 12345-TO",
        status_ativo: true,
        eh_responsavel: true,
      },
    ]);
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

  it("deve exibir indicador de Consentimento LGPD (Responsável Legal), permitir registrar TCLE e manter fluxo contínuo sem abas", async () => {
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(MOCK_PACIENTE);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: MOCK_SESSOES,
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([]);
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

    const badgeLgpd = screen.getByTestId("badge-consentimento-lgpd");
    expect(badgeLgpd.textContent).toContain("Consentimento LGPD");

    const btnRegistrarLgpd = screen.getByTestId("btn-registrar-consentimento-lgpd");
    await act(async () => {
      fireEvent.click(btnRegistrarLgpd);
    });

    expect(screen.getByTestId("badge-consentimento-lgpd").textContent).toContain(
      "Consentimento LGPD: Ativo"
    );

    // Garantia da remoção de abas obsoletas (Problema 1)
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByTestId("tab-prontuario-anotacoes")).toBeNull();
    expect(screen.queryByTestId("tab-sessoes-evolucao")).toBeNull();

    // As 5 seções devem estar renderizadas simultaneamente no fluxo vertical
    expect(screen.getByTestId("secao-visao-geral")).toBeDefined();
    expect(screen.getByTestId("secao-equipe")).toBeDefined();
    expect(screen.getByTestId("secao-prontuario")).toBeDefined();
    expect(screen.getByTestId("secao-anotacoes")).toBeDefined();
    expect(screen.getByTestId("secao-sessoes")).toBeDefined();
  });

  it("deve renderizar a imagem na bolinha de perfil do paciente quando possuir photoUrl", async () => {
    const pacienteComFoto: Paciente = {
      ...MOCK_PACIENTE,
      photoUrl: "https://images.unsplash.com/photo-perfil-paciente.jpg",
    };
    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(pacienteComFoto);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([]);
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

    const avatar = screen.getByTestId("avatar-perfil-paciente");
    expect(avatar).toBeDefined();
    const img = avatar.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(
      "https://images.unsplash.com/photo-perfil-paciente.jpg"
    );
    expect(img?.getAttribute("alt")).toBe("Arthur Vinícius Ramos");
  });

  it("deve permitir selecionar mais de duas sessões para comparação e abrir o modal multi-sessões escalável", async () => {
    const sessoesMulti: Sessao[] = [
      {
        id: "sessao-1",
        clinica_id: "clinica-uuid-9999",
        paciente_id: "paciente-uuid-1234",
        terapeuta_id: "terapeuta-1",
        jogo_id: "jogo-uuid-1",
        session_token: "TEA-001",
        modo_sessao: "sessao_clinica",
        status_sessao: "finalizada",
        data_hora_inicio: "2026-10-01T14:00:00Z",
        duracao_segundos: 1000,
        jogo: { id: "jogo-uuid-1", nome: "Labirinto das Emoções" },
      },
      {
        id: "sessao-2",
        clinica_id: "clinica-uuid-9999",
        paciente_id: "paciente-uuid-1234",
        terapeuta_id: "terapeuta-1",
        jogo_id: "jogo-uuid-1",
        session_token: "TEA-002",
        modo_sessao: "sessao_clinica",
        status_sessao: "finalizada",
        data_hora_inicio: "2026-10-08T14:00:00Z",
        duracao_segundos: 1200,
        jogo: { id: "jogo-uuid-1", nome: "Labirinto das Emoções" },
      },
      {
        id: "sessao-3",
        clinica_id: "clinica-uuid-9999",
        paciente_id: "paciente-uuid-1234",
        terapeuta_id: "terapeuta-1",
        jogo_id: "jogo-uuid-1",
        session_token: "TEA-003",
        modo_sessao: "sessao_clinica",
        status_sessao: "finalizada",
        data_hora_inicio: "2026-10-15T14:00:00Z",
        duracao_segundos: 1400,
        jogo: { id: "jogo-uuid-1", nome: "Labirinto das Emoções" },
      },
    ];

    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(MOCK_PACIENTE);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: sessoesMulti,
      meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([]);
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

    // Encontra os checkboxes das sessões
    const checkboxes = screen.getAllByRole("checkbox", { name: /selecionar/i });
    const checkboxSessao1 = checkboxes[1];
    const checkboxSessao2 = checkboxes[2];
    const checkboxSessao3 = checkboxes[3];

    // Seleciona 1 sessão -> botão aparece translúcido/desabilitado com "Comparar 1/2 Sessões"
    await act(async () => {
      fireEvent.click(checkboxSessao1);
    });

    const btnCompararUm = screen.getByTestId("btn-comparar-sessoes");
    expect(btnCompararUm).toBeDefined();
    expect(btnCompararUm.textContent).toBe("Comparar 1/2 Sessões");
    expect(btnCompararUm.getAttribute("disabled")).not.toBeNull();
    expect(screen.queryByTestId("barra-selecao-sessoes")).toBeNull();

    // Seleciona a 2ª sessão -> botão fica habilitado como "Comparar 2 Sessões"
    await act(async () => {
      fireEvent.click(checkboxSessao2);
    });
    const btnCompararDois = screen.getByTestId("btn-comparar-sessoes");
    expect(btnCompararDois.textContent).toBe("Comparar 2 Sessões");
    expect(btnCompararDois.getAttribute("disabled")).toBeNull();

    // Seleciona a 3ª sessão -> botão atualiza numericamente para "Comparar 3 Sessões"
    await act(async () => {
      fireEvent.click(checkboxSessao3);
    });

    const btnCompararTres = screen.getByTestId("btn-comparar-sessoes");
    expect(btnCompararTres.textContent).toBe("Comparar 3 Sessões");
    expect(btnCompararTres.getAttribute("disabled")).toBeNull();

    // Ao clicar, abre o modal de múltiplas sessões
    await act(async () => {
      fireEvent.click(btnCompararTres);
    });

    expect(screen.getByTestId("modal-comparar-multiplas-sessoes")).toBeDefined();
    expect(screen.getByText("Comparação Analítica Multi-Sessões")).toBeDefined();
  });
});
