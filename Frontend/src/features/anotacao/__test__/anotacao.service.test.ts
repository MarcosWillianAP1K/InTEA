import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { anotacaoService } from "../services/anotacao.service";
import {
  MOCK_ANOTACAO_1,
  MOCK_ANOTACAO_2,
  MOCK_ANOTACAO_3,
  MOCK_ANOTACAO_INATIVA,
  resetarAnotacoesMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Domínio Anotações Clínicas — anotacaoService (Clean Architecture)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetarAnotacoesMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve chamar ENDPOINTS.ANOTACAO.POR_PACIENTE e retornar lista de anotações", async () => {
      const mockResposta = {
        data: [MOCK_ANOTACAO_1, MOCK_ANOTACAO_2],
      };

      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockResposta);

      const resultado = await anotacaoService.listarPorPaciente(
        MOCK_ANOTACAO_1.paciente_id,
      );

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.POR_PACIENTE(MOCK_ANOTACAO_1.paciente_id),
        { params: undefined },
      );
      expect(resultado).toEqual([MOCK_ANOTACAO_1, MOCK_ANOTACAO_2]);
    });

    it("deve serializar e passar filtros de sessão e inativos nos parâmetros", async () => {
      const mockResposta = [MOCK_ANOTACAO_1];
      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockResposta);

      const resultado = await anotacaoService.listarPorPaciente(
        MOCK_ANOTACAO_1.paciente_id,
        { sessao_id: "uuid-sessao-1", incluirInativos: true },
      );

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.POR_PACIENTE(MOCK_ANOTACAO_1.paciente_id),
        {
          params: {
            sessao_id: "uuid-sessao-1",
            incluirInativos: "true",
          },
        },
      );
      expect(resultado).toEqual([MOCK_ANOTACAO_1]);
    });

    it("deve consultar anotação por ID via ENDPOINTS.ANOTACAO.BY_ID", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_ANOTACAO_1 });

      const resultado = await anotacaoService.buscarPorId(MOCK_ANOTACAO_1.id);

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.BY_ID(MOCK_ANOTACAO_1.id),
      );
      expect(resultado).toEqual(MOCK_ANOTACAO_1);
    });

    it("deve criar anotação clínica via ENDPOINTS.ANOTACAO.BASE com POST", async () => {
      const novaAnotacao = {
        ...MOCK_ANOTACAO_1,
        id: "anot-nova-uuid",
        conteudo: "Paciente progrediu na regulação.",
      };

      const postSpy = vi
        .spyOn(http, "post")
        .mockResolvedValue({ data: novaAnotacao });

      const dto = {
        paciente_id: MOCK_ANOTACAO_1.paciente_id,
        conteudo: "Paciente progrediu na regulação.",
      };

      const resultado = await anotacaoService.criar(dto);

      expect(postSpy).toHaveBeenCalledWith(ENDPOINTS.ANOTACAO.BASE, dto);
      expect(resultado.id).toBe("anot-nova-uuid");
      expect(resultado.conteudo).toBe("Paciente progrediu na regulação.");
    });

    it("deve atualizar anotação via ENDPOINTS.ANOTACAO.BY_ID com PATCH", async () => {
      const anotacaoAtualizada = {
        ...MOCK_ANOTACAO_1,
        conteudo: "Texto atualizado.",
      };

      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ data: anotacaoAtualizada });

      const dto = { conteudo: "Texto atualizado." };
      const resultado = await anotacaoService.atualizar(
        MOCK_ANOTACAO_1.id,
        dto,
      );

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.BY_ID(MOCK_ANOTACAO_1.id),
        dto,
      );
      expect(resultado?.conteudo).toBe("Texto atualizado.");
    });

    it("deve inativar anotação via ENDPOINTS.ANOTACAO.BY_ID com DELETE (Soft Delete)", async () => {
      const anotacaoInativada = {
        ...MOCK_ANOTACAO_1,
        soft_delete: true,
        status_ativo: false,
      };

      const deleteSpy = vi
        .spyOn(http, "delete")
        .mockResolvedValue({ data: anotacaoInativada });

      const resultado = await anotacaoService.inativar(MOCK_ANOTACAO_1.id);

      expect(deleteSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.BY_ID(MOCK_ANOTACAO_1.id),
      );
      expect(resultado?.soft_delete).toBe(true);
      expect(resultado?.status_ativo).toBe(false);
    });

    it("deve reativar anotação via ENDPOINTS.ANOTACAO.REATIVAR com PATCH", async () => {
      const anotacaoReativada = {
        ...MOCK_ANOTACAO_INATIVA,
        soft_delete: false,
        status_ativo: true,
      };

      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ data: anotacaoReativada });

      const resultado = await anotacaoService.reativar(
        MOCK_ANOTACAO_INATIVA.id,
      );

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.REATIVAR(MOCK_ANOTACAO_INATIVA.id),
      );
      expect(resultado?.status_ativo).toBe(true);
    });

    it("deve realizar exclusão física via ENDPOINTS.ANOTACAO.HARD_DELETE", async () => {
      const deleteSpy = vi.spyOn(http, "delete").mockResolvedValue({});

      const sucesso = await anotacaoService.deletarHard("uuid-excluir");

      expect(deleteSpy).toHaveBeenCalledWith(
        ENDPOINTS.ANOTACAO.HARD_DELETE("uuid-excluir"),
      );
      expect(sucesso).toBe(true);
    });

    it("deve retornar vazio/null diretamente quando o ID for inválido", async () => {
      const getSpy = vi.spyOn(http, "get");

      const resListar = await anotacaoService.listarPorPaciente("   ");
      expect(resListar).toEqual([]);
      expect(getSpy).not.toHaveBeenCalled();

      const resBuscar = await anotacaoService.buscarPorId("");
      expect(resBuscar).toBeNull();
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  describe("Modo Mock / Fallback Resiliente (Conexão Indisponível)", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(http, "get").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "post").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "patch").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "delete").mockRejectedValue(new Error("Network Error"));
    });

    it("deve listar anotações ativas do paciente no bdmock (RN05)", async () => {
      const anotacoes = await anotacaoService.listarPorPaciente(
        MOCK_ANOTACAO_1.paciente_id,
      );

      expect(anotacoes.length).toBeGreaterThan(0);
      expect(anotacoes.every((a) => !a.soft_delete && a.status_ativo)).toBe(
        true,
      );
      expect(anotacoes.some((a) => a.id === MOCK_ANOTACAO_1.id)).toBe(true);
      expect(anotacoes.some((a) => a.id === MOCK_ANOTACAO_INATIVA.id)).toBe(
        false,
      );
    });

    it("deve incluir anotações inativas no bdmock quando solicitado", async () => {
      const anotacoes = await anotacaoService.listarPorPaciente(
        MOCK_ANOTACAO_INATIVA.paciente_id,
        { incluirInativos: true },
      );

      expect(anotacoes.some((a) => a.id === MOCK_ANOTACAO_INATIVA.id)).toBe(
        true,
      );
    });

    it("deve buscar anotação por ID no bdmock", async () => {
      const anotacao = await anotacaoService.buscarPorId(MOCK_ANOTACAO_2.id);

      expect(anotacao).not.toBeNull();
      expect(anotacao?.id).toBe(MOCK_ANOTACAO_2.id);
      expect(anotacao?.terapeuta_nome).toBe("Dr. Marcos Terapeuta");
    });

    it("deve criar anotação clínica no bdmock gerando ID e timestamps", async () => {
      const novaAnotacao = await anotacaoService.criar({
        paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        conteudo: "Observação comportamental detalhada.",
      });

      expect(novaAnotacao.id).toBeDefined();
      expect(novaAnotacao.conteudo).toBe("Observação comportamental detalhada.");
      expect(novaAnotacao.status_ativo).toBe(true);
      expect(novaAnotacao.soft_delete).toBe(false);
    });

    it("deve atualizar conteúdo de uma anotação no bdmock", async () => {
      const atualizada = await anotacaoService.atualizar(MOCK_ANOTACAO_1.id, {
        conteudo: "Texto revisado no mock.",
      });

      expect(atualizada?.conteudo).toBe("Texto revisado no mock.");
      const busca = await anotacaoService.buscarPorId(MOCK_ANOTACAO_1.id);
      expect(busca?.conteudo).toBe("Texto revisado no mock.");
    });

    it("deve aplicar soft delete no bdmock (RN05)", async () => {
      const inativada = await anotacaoService.inativar(MOCK_ANOTACAO_1.id);

      expect(inativada?.soft_delete).toBe(true);
      expect(inativada?.status_ativo).toBe(false);

      // Não deve aparecer na listagem padrão
      const lista = await anotacaoService.listarPorPaciente(
        MOCK_ANOTACAO_1.paciente_id,
      );
      expect(lista.some((a) => a.id === MOCK_ANOTACAO_1.id)).toBe(false);
    });

    it("deve reativar anotação inativada no bdmock (RN05)", async () => {
      const reativada = await anotacaoService.reativar(
        MOCK_ANOTACAO_INATIVA.id,
      );

      expect(reativada?.status_ativo).toBe(true);
      expect(reativada?.soft_delete).toBe(false);
    });

    it("deve deletar fisicamente registro no bdmock (Hard Delete)", async () => {
      const sucesso = await anotacaoService.deletarHard(MOCK_ANOTACAO_3.id);

      expect(sucesso).toBe(true);
      const busca = await anotacaoService.buscarPorId(MOCK_ANOTACAO_3.id);
      expect(busca).toBeNull();
    });
  });
});
