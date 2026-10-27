import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { GerenciadorAnotacoesProntuario } from "../components/GerenciadorAnotacoesProntuario";
import { CardAnotacaoClinica } from "../components/CardAnotacaoClinica";
import { FiltrosAnotacoesClinicas } from "../components/FiltrosAnotacoesClinicas";
import { FormularioContextoDDA } from "../../sessao/components/FormularioContextoDDA";
import { anotacaoService } from "../services/anotacao.service";
import type { AnotacaoClinica } from "../types/anotacao.types";

const TERAPEUTA_LOGADO_ID = "a9849163-613f-4492-90cf-89985902d16e";
const OUTRO_TERAPEUTA_ID = "b3333333-3333-4333-8333-333333333333";
const PACIENTE_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

const ANOTACAO_AUTOR_LOGADO: AnotacaoClinica = {
  id: "nota-1",
  paciente_id: PACIENTE_ID,
  terapeuta_id: TERAPEUTA_LOGADO_ID,
  sessao_id: "sessao-uuid-1",
  conteudo: "Paciente manteve excelente autorregulação sensorial durante a intervenção.",
  soft_delete: false,
  status_ativo: true,
  terapeuta_nome: "Dr. Marcos Terapeuta",
  created_at: "2026-10-27T10:00:00.000Z",
  updated_at: "2026-10-27T10:00:00.000Z",
  autor: {
    id: TERAPEUTA_LOGADO_ID,
    nome: "Dr. Marcos Terapeuta",
    registro_profissional: "CRP 11/04589",
    especialidade: "Neuropsicologia Clínica",
  },
};

const ANOTACAO_OUTRO_AUTOR: AnotacaoClinica = {
  id: "nota-2",
  paciente_id: PACIENTE_ID,
  terapeuta_id: OUTRO_TERAPEUTA_ID,
  sessao_id: null,
  conteudo: "Avaliação inicial da terapeuta ocupacional: hipersensibilidade auditiva moderada.",
  soft_delete: false,
  status_ativo: true,
  terapeuta_nome: "Dra. Luma Maiara",
  created_at: "2026-10-26T15:30:00.000Z",
  updated_at: "2026-10-26T15:30:00.000Z",
  autor: {
    id: OUTRO_TERAPEUTA_ID,
    nome: "Dra. Luma Maiara",
    registro_profissional: "CREFITO 12345-TO",
    crefito: "12345-TO",
    especialidade: "Terapia Ocupacional e Integração Sensorial",
  },
};

describe("GerenciadorAnotacoesProntuario e Componentes Modulares (Sprint 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Cobertura dos 4 Estados Visuais da Listagem", () => {
    it("deve renderizar o Skeleton Loader enquanto carrega sem disparar CLS", () => {
      // Mock da listagem com promessa pendente
      vi.spyOn(anotacaoService, "listarPorPaciente").mockImplementation(
        () => new Promise(() => {}),
      );

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      expect(screen.getByTestId("anotacoes-skeleton")).toBeDefined();
    });

    it("deve renderizar o Empty State amigável quando nenhuma anotação for encontrada", async () => {
      vi.spyOn(anotacaoService, "listarPorPaciente").mockResolvedValue([]);

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("anotacoes-empty")).toBeDefined();
      });

      expect(
        screen.getByText(/Nenhuma anotação encontrada/i),
      ).toBeDefined();
    });

    it("deve renderizar o Error State com botão de retry quando houver falha de rede/serviço", async () => {
      const listarSpy = vi
        .spyOn(anotacaoService, "listarPorPaciente")
        .mockRejectedValueOnce(new Error("Falha na conexão com o prontuário eletrônico."));

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("anotacoes-error")).toBeDefined();
      });

      expect(
        screen.getByText("Falha na conexão com o prontuário eletrônico."),
      ).toBeDefined();

      // Testa o botão de Retry
      listarSpy.mockResolvedValueOnce([ANOTACAO_AUTOR_LOGADO]);
      const botaoRetry = screen.getByTestId("botao-retry-anotacoes");
      fireEvent.click(botaoRetry);

      await waitFor(() => {
        expect(screen.getByTestId("anotacoes-lista")).toBeDefined();
      });
    });

    it("deve renderizar o Success State com a lista de cards de anotações", async () => {
      vi.spyOn(anotacaoService, "listarPorPaciente").mockResolvedValue([
        ANOTACAO_AUTOR_LOGADO,
        ANOTACAO_OUTRO_AUTOR,
      ]);

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("anotacoes-lista")).toBeDefined();
      });

      expect(
        screen.getByTestId(`card-anotacao-${ANOTACAO_AUTOR_LOGADO.id}`),
      ).toBeDefined();
      expect(
        screen.getByTestId(`card-anotacao-${ANOTACAO_OUTRO_AUTOR.id}`),
      ).toBeDefined();
    });
  });

  describe("2. Autoria Indelével e Conformidade com RF21", () => {
    it("deve exibir nome completo, conselho profissional e especialidade sem UUID truncado", () => {
      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_OUTRO_AUTOR}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      const nomeElem = screen.getByTestId("autor-nome");
      expect(nomeElem.textContent).toBe("Dra. Luma Maiara");
      expect(nomeElem.textContent).not.toContain("b3333333");

      const conselhoElem = screen.getByTestId("autor-conselho");
      expect(conselhoElem.textContent).toBe("CREFITO 12345-TO");

      const espElem = screen.getByTestId("autor-especialidade");
      expect(espElem.textContent).toBe(
        "Terapia Ocupacional e Integração Sensorial",
      );
    });

    it("deve exibir badge de Sessão Clínica quando a anotação for vinculada à sessão", () => {
      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_AUTOR_LOGADO}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      expect(screen.getByTestId("badge-sessao")).toBeDefined();
      expect(screen.getByText(/Sessão Clínica/i)).toBeDefined();
    });

    it("deve exibir badge de Prontuário Geral quando a anotação não tiver sessao_id", () => {
      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_OUTRO_AUTOR}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      expect(screen.getByTestId("badge-prontuario")).toBeDefined();
      expect(screen.getByText(/Prontuário Geral/i)).toBeDefined();
    });
  });

  describe("3. Permissões de Edição e Inativação Lógica (RN05)", () => {
    it("deve permitir edição e inativação quando o usuário logado for o autor da nota", () => {
      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_AUTOR_LOGADO}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      expect(screen.getByTestId("botao-editar-anotacao")).toBeDefined();
      expect(screen.getByTestId("botao-inativar-anotacao")).toBeDefined();
    });

    it("deve BLOQUEAR controles de edição e inativação para anotações de outro profissional", () => {
      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_OUTRO_AUTOR}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      expect(screen.queryByTestId("botao-editar-anotacao")).toBeNull();
      expect(screen.queryByTestId("botao-inativar-anotacao")).toBeNull();
    });

    it("deve abrir modo de edição inline e acionar onAtualizar ao salvar", async () => {
      const onAtualizarMock = vi.fn().mockResolvedValue(undefined);

      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_AUTOR_LOGADO}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
          onAtualizar={onAtualizarMock}
        />,
      );

      const botaoEditar = screen.getByTestId("botao-editar-anotacao");
      fireEvent.click(botaoEditar);

      expect(screen.getByTestId("container-edicao-inline")).toBeDefined();

      const textarea = screen.getByTestId("textarea-edicao");
      fireEvent.change(textarea, {
        target: { value: "Texto clínico revisado com sucesso." },
      });

      const botaoSalvar = screen.getByTestId("botao-salvar-edicao");
      await act(async () => {
        fireEvent.click(botaoSalvar);
      });

      expect(onAtualizarMock).toHaveBeenCalledWith(
        ANOTACAO_AUTOR_LOGADO.id,
        "Texto clínico revisado com sucesso.",
      );
    });

    it("deve solicitar confirmação antes de inativar e acionar onInativar (RN05)", async () => {
      const onInativarMock = vi.fn().mockResolvedValue(undefined);

      render(
        <CardAnotacaoClinica
          anotacao={ANOTACAO_AUTOR_LOGADO}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
          onInativar={onInativarMock}
        />,
      );

      const botaoInativar = screen.getByTestId("botao-inativar-anotacao");
      fireEvent.click(botaoInativar);

      expect(screen.getByTestId("alerta-confirmar-inativacao")).toBeDefined();

      const botaoConfirmar = screen.getByTestId("botao-confirmar-inativacao");
      await act(async () => {
        fireEvent.click(botaoConfirmar);
      });

      expect(onInativarMock).toHaveBeenCalledWith(ANOTACAO_AUTOR_LOGADO.id);
    });
  });

  describe("4. Criação de Nova Anotação no Gerenciador", () => {
    it("deve desabilitar botão quando texto estiver vazio e atualizar contador de caracteres", async () => {
      vi.spyOn(anotacaoService, "listarPorPaciente").mockResolvedValue([]);

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("botao-salvar-nova-anotacao")).toBeDefined();
      });

      const botaoSalvar = screen.getByTestId("botao-salvar-nova-anotacao") as HTMLButtonElement;
      expect(botaoSalvar.disabled).toBe(true);

      const textarea = screen.getByTestId("textarea-nova-anotacao");
      fireEvent.change(textarea, { target: { value: "Nova evolução clínica." } });

      expect(botaoSalvar.disabled).toBe(false);
      expect(screen.getByTestId("contador-caracteres").textContent).toBe(
        "22/2000",
      );
    });

    it("deve submeter nova anotação via anotacaoService.criar e incluí-la na lista", async () => {
      vi.spyOn(anotacaoService, "listarPorPaciente").mockResolvedValue([]);
      const novaNotaRetorno: AnotacaoClinica = {
        id: "nova-nota-uuid",
        paciente_id: PACIENTE_ID,
        terapeuta_id: TERAPEUTA_LOGADO_ID,
        sessao_id: null,
        conteudo: "Nova anotação de acompanhamento neuropsicológico.",
        soft_delete: false,
        status_ativo: true,
        terapeuta_nome: "Dr. Marcos Terapeuta",
        created_at: new Date().toISOString(),
      };
      const criarSpy = vi
        .spyOn(anotacaoService, "criar")
        .mockResolvedValue(novaNotaRetorno);

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("textarea-nova-anotacao")).toBeDefined();
      });

      const textarea = screen.getByTestId("textarea-nova-anotacao");
      fireEvent.change(textarea, {
        target: { value: "Nova anotação de acompanhamento neuropsicológico." },
      });

      const botaoSalvar = screen.getByTestId("botao-salvar-nova-anotacao");
      await act(async () => {
        fireEvent.click(botaoSalvar);
      });

      expect(criarSpy).toHaveBeenCalledWith({
        paciente_id: PACIENTE_ID,
        sessao_id: null,
        conteudo: "Nova anotação de acompanhamento neuropsicológico.",
        terapeuta_id: TERAPEUTA_LOGADO_ID,
      });

      await waitFor(() => {
        expect(
          screen.getByText("Nova anotação de acompanhamento neuropsicológico."),
        ).toBeDefined();
      });
    });
  });

  describe("5. Filtros de Anotações Clínicas", () => {
    it("deve filtrar anotações por busca textual em tempo real", async () => {
      vi.spyOn(anotacaoService, "listarPorPaciente").mockResolvedValue([
        ANOTACAO_AUTOR_LOGADO,
        ANOTACAO_OUTRO_AUTOR,
      ]);

      render(
        <GerenciadorAnotacoesProntuario
          pacienteId={PACIENTE_ID}
          usuarioLogadoId={TERAPEUTA_LOGADO_ID}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("anotacoes-lista")).toBeDefined();
      });

      const inputBusca = screen.getByTestId("input-busca-anotacao");
      fireEvent.change(inputBusca, { target: { value: "hipersensibilidade" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Avaliação inicial da terapeuta/i),
        ).toBeDefined();
        expect(
          screen.queryByText(/Paciente manteve excelente autorregulação/i),
        ).toBeNull();
      });
    });

    it("deve disparar onFiltrosChange no componente FiltrosAnotacoesClinicas", () => {
      const onFiltrosChangeMock = vi.fn();
      render(
        <FiltrosAnotacoesClinicas
          filtros={{ paciente_id: PACIENTE_ID }}
          onFiltrosChange={onFiltrosChangeMock}
          autoresDisponiveis={[
            { id: TERAPEUTA_LOGADO_ID, nome: "Dr. Marcos" },
          ]}
        />,
      );

      const selectOrigem = screen.getByTestId("select-filtro-origem");
      fireEvent.change(selectOrigem, { target: { value: "sessao" } });
      expect(onFiltrosChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({ somenteSemSessao: false }),
      );

      const checkboxInativos = screen.getByTestId("checkbox-incluir-inativos");
      fireEvent.click(checkboxInativos);
      expect(onFiltrosChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({ incluirInativos: true }),
      );
    });
  });

  describe("6. FormularioContextoDDA (Figura 5 e Figura 11)", () => {
    it("deve renderizar botões 1 a 5 de estresse, chips de gatilhos e seletor de objetivo", () => {
      const onNivelEstresseChange = vi.fn();
      const onToggleGatilho = vi.fn();
      const onObjetivoClinicoChange = vi.fn();
      const onToggleFallback = vi.fn();

      render(
        <FormularioContextoDDA
          nivelEstresse={1}
          onNivelEstresseChange={onNivelEstresseChange}
          gatilhosAtivos={["Som Alto"]}
          onToggleGatilho={onToggleGatilho}
          objetivoClinico="Foco Atencional"
          onObjetivoClinicoChange={onObjetivoClinicoChange}
          usarFallback={false}
          onToggleFallback={onToggleFallback}
        />,
      );

      // Nível de estresse
      expect(screen.getByTestId("valor-estresse").textContent).toBe("1");
      const botaoEstresse4 = screen.getByRole("button", {
        name: /Definir nível de estresse para 4/i,
      });
      fireEvent.click(botaoEstresse4);
      expect(onNivelEstresseChange).toHaveBeenCalledWith(4);

      // Gatilhos a evitar
      const chipSom = screen.getByRole("button", { name: /Som Alto/i });
      fireEvent.click(chipSom);
      expect(onToggleGatilho).toHaveBeenCalledWith("Som Alto");

      // Objetivo clínico
      const selectObjetivo = screen.getByTestId("select-objetivo-clinico");
      fireEvent.change(selectObjetivo, {
        target: { value: "Regulação Emocional" },
      });
      expect(onObjetivoClinicoChange).toHaveBeenCalledWith("Regulação Emocional");

      // Fallback da Figura 5
      const toggleFallback = screen.getByTestId("toggle-fallback-dda");
      fireEvent.click(toggleFallback);
      expect(onToggleFallback).toHaveBeenCalledWith(true);
    });

    it("deve exibir banner explicativo quando o Fallback da Figura 5 estiver ativado", () => {
      render(
        <FormularioContextoDDA
          nivelEstresse={1}
          onNivelEstresseChange={vi.fn()}
          gatilhosAtivos={[]}
          onToggleGatilho={vi.fn()}
          usarFallback={true}
          onToggleFallback={vi.fn()}
        />,
      );

      expect(screen.getByTestId("banner-fallback-ativo")).toBeDefined();
      expect(screen.getByText(/Fallback Homologado Ativo/i)).toBeDefined();
    });
  });
});
