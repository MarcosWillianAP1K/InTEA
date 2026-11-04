/**
 * ============================================================================
 * TESTES DE INTEGRAÇÃO: GESTÃO DE EQUIPE MULTIDISCIPLINAR NO PERFIL DO PACIENTE
 * Arquivo: Frontend/src/features/paciente/__test__/PerfilPacienteEquipe.test.tsx
 * Conformidade: RF06, RF18, RF19, RF21, RN04, Seção 7.7 do PDF
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PerfilPacientePage } from "../pages/PerfilPacientePage";
import { CockpitSessaoPage } from "@/features/sessao/pages/CockpitSessaoPage";
import { ResultadoSessaoPage } from "@/features/sessao/pages/ResultadoSessaoPage";
import { pacienteService } from "../services/paciente.service";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { MOCK_PACIENTE_PEDRO } from "../types/bdmock";
import type { EspecialistaVinculado } from "../types/paciente.types";
import type { Terapeuta } from "@/features/terapeuta/types/terapeuta.types";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/features/anotacao", () => ({
  GerenciadorAnotacoesProntuario: () => (
    <div data-testid="mock-gerenciador-anotacoes">Anotações do Prontuário</div>
  ),
}));

const ESPECIALISTA_MARCOS: EspecialistaVinculado = {
  id: "a9849163-613f-4492-90cf-89985902d16e",
  nome: "Dr. Marcos Terapeuta",
  email: "marcos.terapeuta@intea.com.br",
  crefito: "CREFITO-14/12345-TO",
  registro_profissional: "CREFITO-14/12345-TO",
  especialidade: "Terapia Ocupacional e Integração Sensorial",
  papel_equipe: "Especialista Responsável",
  status_ativo: true,
};

const ESPECIALISTA_LUMA: EspecialistaVinculado = {
  id: "b3333333-3333-4333-8333-333333333333",
  nome: "Dra. Luma Maiara",
  email: "luma.maiara@intea.com.br",
  crefito: "CRP-21/04567",
  crp: "CRP-21/04567",
  registro_profissional: "CRP-21/04567",
  especialidade: "Psicologia Cognitivo-Comportamental e ABA",
  papel_equipe: "Equipe Multidisciplinar",
  status_ativo: true,
};

const TERAPEUTA_DISPONIVEL_HERMESON: Terapeuta = {
  id: "c4444444-4444-4444-8444-444444444444",
  clinica_id: MOCK_PACIENTE_PEDRO.clinica_id,
  nome: "Dr. Hermeson Alves",
  email: "hermeson.alves@intea.com.br",
  telefone: "(86) 99977-1122",
  crefito: "CREFITO-14/87654-TO",
  registro_profissional: "CREFITO-14/87654-TO",
  especialidade: "Psicomotricidade e Reabilitação Motora",
  tempo_experiencia_anos: 4,
  is_super_admin: false,
  status_ativo: true,
  created_at: "2026-01-15T09:00:00.000Z",
  updated_at: "2026-01-15T09:00:00.000Z",
};

function renderizarPerfilPaciente(pacienteId = MOCK_PACIENTE_PEDRO.id) {
  return render(
    <MemoryRouter initialEntries={[`/pacientes/${pacienteId}`]}>
      <Routes>
        <Route path="/pacientes/:id" element={<PerfilPacientePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PerfilPacientePage — Gestão de Equipe Multidisciplinar (RF06, RF18, RN04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: ESPECIALISTA_MARCOS.id,
        nome: ESPECIALISTA_MARCOS.nome,
        email: ESPECIALISTA_MARCOS.email || "marcos@intea.com.br",
        clinica_id: MOCK_PACIENTE_PEDRO.clinica_id,
        crefito: ESPECIALISTA_MARCOS.crefito || "CREFITO-14/12345-TO",
        registro_profissional:
          ESPECIALISTA_MARCOS.registro_profissional || "CREFITO-14/12345-TO",
        especialidade:
          ESPECIALISTA_MARCOS.especialidade || "Terapia Ocupacional",
        is_super_admin: false,
        status_ativo: true,
        role: "terapeuta",
      },
      isAuthenticated: true,
    });

    vi.spyOn(pacienteService, "buscarPorId").mockResolvedValue(
      MOCK_PACIENTE_PEDRO,
    );
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([
      ESPECIALISTA_MARCOS,
      ESPECIALISTA_LUMA,
    ]);
    vi.spyOn(terapeutaService, "listar").mockResolvedValue([
      {
        ...TERAPEUTA_DISPONIVEL_HERMESON,
        id: ESPECIALISTA_MARCOS.id,
        nome: ESPECIALISTA_MARCOS.nome,
        especialidade: ESPECIALISTA_MARCOS.especialidade,
        crefito: ESPECIALISTA_MARCOS.crefito,
      },
      {
        ...TERAPEUTA_DISPONIVEL_HERMESON,
        id: ESPECIALISTA_LUMA.id,
        nome: ESPECIALISTA_LUMA.nome,
        especialidade: ESPECIALISTA_LUMA.especialidade,
        crefito: ESPECIALISTA_LUMA.crefito,
      },
      TERAPEUTA_DISPONIVEL_HERMESON,
    ]);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: [
        {
          id: "sessao-marcos-01",
          paciente_id: MOCK_PACIENTE_PEDRO.id,
          terapeuta_id: ESPECIALISTA_MARCOS.id,
          jogo_id: "jogo-01",
          modo_sessao: "sessao_clinica",
          status_sessao: "finalizada",
          session_token: "PIN-001",
          data_hora_inicio: "2026-10-10T14:00:00.000Z",
          data_hora_fim: "2026-10-10T14:30:00.000Z",
          jogo: { id: "jogo-01", nome: "Aventura Sensorial" },
          terapeuta: {
            id: ESPECIALISTA_MARCOS.id,
            nome: ESPECIALISTA_MARCOS.nome,
            registro_profissional: "CREFITO-14/12345-TO",
          },
        },
        {
          id: "sessao-luma-02",
          paciente_id: MOCK_PACIENTE_PEDRO.id,
          terapeuta_id: ESPECIALISTA_LUMA.id,
          jogo_id: "jogo-02",
          modo_sessao: "sessao_clinica",
          status_sessao: "finalizada",
          session_token: "PIN-002",
          data_hora_inicio: "2026-10-12T15:00:00.000Z",
          data_hora_fim: "2026-10-12T15:35:00.000Z",
          jogo: { id: "jogo-02", nome: "Expressões e Emoções ABA" },
          terapeuta: {
            id: ESPECIALISTA_LUMA.id,
            nome: ESPECIALISTA_LUMA.nome,
            registro_profissional: "CRP-21/04567",
          },
        },
      ],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it("1. deve listar os especialistas vinculados na Equipe Multidisciplinar com badge 'Você (Logado)' e sem o termo proibido 'Co-Terapeuta'", async () => {
    renderizarPerfilPaciente();

    await waitFor(() => {
      expect(
        screen.getByTestId("painel-equipe-multidisciplinar"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Equipe Multidisciplinar \(Especialistas Vinculados\)/i),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId(`card-especialista-${ESPECIALISTA_MARCOS.id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`card-especialista-${ESPECIALISTA_LUMA.id}`),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId(`badge-voce-logado-${ESPECIALISTA_MARCOS.id}`),
    ).toHaveTextContent("Você (Logado)");

    // Conformidade estrita com Seção 7.7: jamais utilizar o termo "Co-Terapeuta"
    expect(screen.queryByText(/Co-Terapeuta/i)).not.toBeInTheDocument();
  });

  it("2. deve abrir o ModalVincularEspecialista, filtrar por busca e vincular um novo especialista da clínica", async () => {
    const vincularSpy = vi
      .spyOn(pacienteService, "vincularTerapeuta")
      .mockResolvedValue({
        message: "Terapeuta vinculado ao paciente com sucesso.",
      });

    vi.spyOn(pacienteService, "listarTerapeutasVinculados")
      .mockResolvedValueOnce([ESPECIALISTA_MARCOS, ESPECIALISTA_LUMA])
      .mockResolvedValueOnce([
        ESPECIALISTA_MARCOS,
        ESPECIALISTA_LUMA,
        {
          id: TERAPEUTA_DISPONIVEL_HERMESON.id,
          nome: TERAPEUTA_DISPONIVEL_HERMESON.nome,
          crefito: TERAPEUTA_DISPONIVEL_HERMESON.crefito,
          registro_profissional:
            TERAPEUTA_DISPONIVEL_HERMESON.registro_profissional,
          especialidade: TERAPEUTA_DISPONIVEL_HERMESON.especialidade,
          status_ativo: true,
        },
      ]);

    renderizarPerfilPaciente();

    const btnAbrirModal = await screen.findByTestId("btn-abrir-modal-vincular");
    fireEvent.click(btnAbrirModal);

    expect(
      await screen.findByTestId("modal-vincular-especialista"),
    ).toBeInTheDocument();

    // Especialistas já vinculados aparecem sinalizados e desabilitados
    expect(
      screen.getByTestId(`badge-ja-vinculado-${ESPECIALISTA_MARCOS.id}`),
    ).toHaveTextContent("Já faz parte da equipe");

    // Filtra pelo novo especialista disponível na clínica
    const inputBusca = screen.getByTestId("input-busca-especialista");
    fireEvent.change(inputBusca, { target: { value: "Psicomotricidade" } });

    const opcaoHermeson = screen.getByTestId(
      `opcao-especialista-${TERAPEUTA_DISPONIVEL_HERMESON.id}`,
    );
    expect(opcaoHermeson).toBeInTheDocument();

    fireEvent.click(opcaoHermeson);

    const btnConfirmar = screen.getByTestId("btn-confirmar-vinculo");
    expect(btnConfirmar).not.toBeDisabled();
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(vincularSpy).toHaveBeenCalledWith(MOCK_PACIENTE_PEDRO.id, {
        terapeuta_id: TERAPEUTA_DISPONIVEL_HERMESON.id,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(
          `card-especialista-${TERAPEUTA_DISPONIVEL_HERMESON.id}`,
        ),
      ).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("3. deve exibir alerta e toast quando a API rejeita a remoção do último especialista com 409 Conflict e desabilitar o botão quando resta apenas 1 especialista", async () => {
    const erro409 = new Error(
      "Não é possível remover o único especialista vinculado ao paciente (409 Conflict).",
    ) as Error & { status?: number };
    erro409.status = 409;

    const desvincularSpy = vi
      .spyOn(pacienteService, "desvincularTerapeuta")
      .mockRejectedValueOnce(erro409);

    renderizarPerfilPaciente();

    const btnDesvincularLuma = await screen.findByTestId(
      `btn-desvincular-${ESPECIALISTA_LUMA.id}`,
    );
    expect(btnDesvincularLuma).not.toBeDisabled();

    fireEvent.click(btnDesvincularLuma);

    await waitFor(() => {
      expect(desvincularSpy).toHaveBeenCalledWith(
        MOCK_PACIENTE_PEDRO.id,
        ESPECIALISTA_LUMA.id,
      );
    });

    const alertaConflito = await screen.findByTestId("alerta-conflito-equipe");
    expect(alertaConflito).toHaveTextContent(/409|único especialista/i);
    expect(toast.error).toHaveBeenCalled();
  });

  it("4. deve exibir visualização compartilhada de sessões conduzidas por diferentes especialistas da Equipe Multidisciplinar", async () => {
    renderizarPerfilPaciente();

    await waitFor(() => {
      expect(
        screen.getByTestId("autoria-sessao-sessao-marcos-01"),
      ).toBeInTheDocument();
    });

    const celulaAutoriaMarcos = screen.getByTestId(
      "autoria-sessao-sessao-marcos-01",
    );
    const celulaAutoriaLuma = screen.getByTestId(
      "autoria-sessao-sessao-luma-02",
    );

    expect(celulaAutoriaMarcos).toHaveTextContent("Dr. Marcos Terapeuta");
    expect(celulaAutoriaMarcos).toHaveTextContent(
      "Terapia Ocupacional e Integração Sensorial",
    );

    expect(celulaAutoriaLuma).toHaveTextContent("Dra. Luma Maiara");
    expect(celulaAutoriaLuma).toHaveTextContent(
      "Psicologia Cognitivo-Comportamental e ABA",
    );
  });

  it("5. deve desabilitar o botão de desvincular quando restar apenas 1 especialista e bloquear início de sessão concorrente (409 Conflict)", async () => {
    vi.spyOn(pacienteService, "listarTerapeutasVinculados").mockResolvedValue([
      ESPECIALISTA_MARCOS,
    ]);
    vi.spyOn(sessaoService, "listar").mockResolvedValue({
      data: [
        {
          id: "sessao-ativa-luma",
          paciente_id: MOCK_PACIENTE_PEDRO.id,
          terapeuta_id: ESPECIALISTA_LUMA.id,
          jogo_id: "jogo-02",
          modo_sessao: "sessao_clinica",
          status_sessao: "em_andamento",
          session_token: "PIN-ATIVO",
          data_hora_inicio: "2026-10-15T14:00:00.000Z",
          jogo: { id: "jogo-02", nome: "Expressões e Emoções ABA" },
          terapeuta: {
            id: ESPECIALISTA_LUMA.id,
            nome: ESPECIALISTA_LUMA.nome,
            registro_profissional: "CRP-21/04567",
          },
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    renderizarPerfilPaciente();

    const btnUnico = await screen.findByTestId(
      `btn-desvincular-${ESPECIALISTA_MARCOS.id}`,
    );
    expect(btnUnico).toBeDisabled();
    expect(btnUnico).toHaveAttribute(
      "title",
      "O paciente deve possuir ao menos 1 especialista vinculado",
    );

    const btnIniciarSessao = screen.getByRole("button", {
      name: /Iniciar Sessão com este Paciente/i,
    });
    fireEvent.click(btnIniciarSessao);

    const alertaConflito = await screen.findByTestId("alerta-conflito-equipe");
    expect(alertaConflito).toHaveTextContent(/Conflito de sessão ativa \(409\)/i);
    expect(alertaConflito).toHaveTextContent(/Dra\. Luma Maiara/i);
  });

  it("6. deve ativar Modo Observador no CockpitSessaoPage e preservar Parecer Original somente leitura no ResultadoSessaoPage quando conduzida por outro especialista da equipe", async () => {
    vi.spyOn(sessaoService, "buscarPorId").mockResolvedValue({
      id: "sessao-conduzida-luma",
      paciente_id: MOCK_PACIENTE_PEDRO.id,
      terapeuta_id: ESPECIALISTA_LUMA.id,
      jogo_id: "jogo-02",
      modo_sessao: "sessao_clinica",
      status_sessao: "em_andamento",
      session_token: "PIN-LUMA-01",
      data_hora_inicio: "2026-10-15T14:00:00.000Z",
      paciente: { id: MOCK_PACIENTE_PEDRO.id, nome: MOCK_PACIENTE_PEDRO.nome },
      jogo: { id: "jogo-02", nome: "Expressões e Emoções ABA" },
      terapeuta: {
        id: ESPECIALISTA_LUMA.id,
        nome: ESPECIALISTA_LUMA.nome,
        registro_profissional: "CRP-21/04567",
      },
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/sessao/sessao-conduzida-luma/monitoramento"]}>
        <Routes>
          <Route path="/sessao/:id/monitoramento" element={<CockpitSessaoPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const bannerObservador = await screen.findByTestId("banner-modo-observador");
    expect(bannerObservador).toHaveTextContent(
      /Modo Acompanhamento da Equipe — Sessão conduzida por Dra\. Luma Maiara/i,
    );
    expect(screen.getByTestId("botao-pausar")).toBeDisabled();
    expect(screen.getByTestId("btn-dda-1")).toBeDisabled();
    expect(screen.getByTestId("botao-finalizar-sessao")).toBeDisabled();
    unmount();

    render(
      <MemoryRouter initialEntries={["/sessao/sessao-conduzida-luma/resultado"]}>
        <ResultadoSessaoPage
          sessaoId="sessao-conduzida-luma"
          initialData={{
            id: "sessao-conduzida-luma",
            session_token: "PIN-LUMA-01",
            status_sessao: "finalizada",
            is_modo_livre: false,
            duracao_segundos: 1200,
            data_hora_inicio: "2026-10-15T14:00:00.000Z",
            data_hora_fim: "2026-10-15T14:20:00.000Z",
            paciente: {
              id: MOCK_PACIENTE_PEDRO.id,
              nome: MOCK_PACIENTE_PEDRO.nome,
            },
            jogo: { id: "jogo-02", titulo: "Expressões e Emoções ABA" },
            terapeuta: {
              id: ESPECIALISTA_LUMA.id,
              nome: ESPECIALISTA_LUMA.nome,
              registro_profissional: "CRP-21/04567",
            },
            anotacoes: [
              {
                id: "nota-original-luma",
                conteudo: "Parecer clínico registrado pela Dra. Luma na sessão.",
                terapeuta_id: ESPECIALISTA_LUMA.id,
                terapeuta_nome: ESPECIALISTA_LUMA.nome,
                registro_profissional: "CRP-21/04567",
                created_at: "2026-10-15T14:21:00.000Z",
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByTestId("parecer-original-somente-leitura"),
    ).toHaveTextContent("Parecer clínico registrado pela Dra. Luma na sessão.");
    expect(
      screen.getByTestId("badge-sessao-outro-especialista"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Co-Terapeuta/i)).not.toBeInTheDocument();
  });
});
