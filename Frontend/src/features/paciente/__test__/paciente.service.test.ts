import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pacienteService } from "../services/paciente.service";
import {
  MOCK_PACIENTE_PEDRO,
  MOCK_PACIENTE_SOFIA,
  MOCK_PACIENTE_LUCAS,
  MOCK_PACIENTE_INATIVO,
  resetarPacientesMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Dominio Paciente — pacienteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetarPacientesMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve chamar ENDPOINTS.PACIENTE.BASE com filtros corretos e retornar lista de pacientes", async () => {
      const mockApiResposta = {
        data: [MOCK_PACIENTE_PEDRO],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockApiResposta);

      const resultado = await pacienteService.listar({
        nome: "Pedro",
        idadeMin: 4,
        idadeMax: 10,
        page: 1,
        limit: 10,
      });

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.PACIENTE.BASE, {
        params: {
          nome: "Pedro",
          idadeMin: "4",
          idadeMax: "10",
          page: "1",
          limit: "10",
        },
      });
      expect(resultado).toEqual([MOCK_PACIENTE_PEDRO]);
    });

    it("deve chamar ENDPOINTS.PACIENTE.BY_ID e retornar paciente encontrado", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_PACIENTE_SOFIA });

      const resultado = await pacienteService.buscarPorId(
        MOCK_PACIENTE_SOFIA.id,
      );

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.BY_ID(MOCK_PACIENTE_SOFIA.id),
      );
      expect(resultado).toEqual(MOCK_PACIENTE_SOFIA);
    });

    it("deve chamar ENDPOINTS.PACIENTE.BASE com POST para criar novo paciente", async () => {
      const novoPacienteMock = {
        ...MOCK_PACIENTE_LUCAS,
        id: "novo-uuid-123",
        nome: "Novo Paciente Teste",
      };

      const postSpy = vi
        .spyOn(http, "post")
        .mockResolvedValue({ data: novoPacienteMock });

      const payload = {
        nome: "Novo Paciente Teste",
        data_nascimento: "2019-05-15",
        cpf: "111.222.333-44",
      };

      const resultado = await pacienteService.criar(payload);

      expect(postSpy).toHaveBeenCalledWith(ENDPOINTS.PACIENTE.BASE, payload);
      expect(resultado.id).toBe("novo-uuid-123");
      expect(resultado.nome).toBe("Novo Paciente Teste");
    });

    it("deve chamar ENDPOINTS.PACIENTE.BY_ID com PUT para atualizar paciente", async () => {
      const pacienteAtualizado = {
        ...MOCK_PACIENTE_PEDRO,
        telefone: "(11) 91111-2222",
      };

      const putSpy = vi
        .spyOn(http, "put")
        .mockResolvedValue({ data: pacienteAtualizado });

      const resultado = await pacienteService.atualizar(
        MOCK_PACIENTE_PEDRO.id,
        {
          telefone: "(11) 91111-2222",
        },
      );

      expect(putSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.BY_ID(MOCK_PACIENTE_PEDRO.id),
        { telefone: "(11) 91111-2222" },
      );
      expect(resultado?.telefone).toBe("(11) 91111-2222");
    });

    it("deve chamar ENDPOINTS.PACIENTE.BY_ID com DELETE para soft delete", async () => {
      const pacienteInativado = {
        ...MOCK_PACIENTE_PEDRO,
        status_ativo: false,
      };

      const deleteSpy = vi
        .spyOn(http, "delete")
        .mockResolvedValue({ data: pacienteInativado });

      const resultado = await pacienteService.inativar(MOCK_PACIENTE_PEDRO.id);

      expect(deleteSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.BY_ID(MOCK_PACIENTE_PEDRO.id),
      );
      expect(resultado?.status_ativo).toBe(false);
    });

    it("deve chamar ENDPOINTS.PACIENTE.REATIVAR com PATCH para reativar paciente", async () => {
      const pacienteReativado = {
        ...MOCK_PACIENTE_INATIVO,
        status_ativo: true,
      };

      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ data: pacienteReativado });

      const resultado = await pacienteService.reativar(
        MOCK_PACIENTE_INATIVO.id,
      );

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.REATIVAR(MOCK_PACIENTE_INATIVO.id),
      );
      expect(resultado?.status_ativo).toBe(true);
    });

    it("deve listar terapeutas vinculados via ENDPOINTS.PACIENTE.TERAPEUTAS", async () => {
      const mockTerapeutas = MOCK_PACIENTE_PEDRO.terapeutas ?? [];
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: mockTerapeutas });

      const resultado = await pacienteService.listarTerapeutas(
        MOCK_PACIENTE_PEDRO.id,
      );

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.TERAPEUTAS(MOCK_PACIENTE_PEDRO.id),
      );
      expect(resultado).toEqual(mockTerapeutas);
    });

    it("deve vincular terapeuta via POST em ENDPOINTS.PACIENTE.TERAPEUTAS", async () => {
      const postSpy = vi.spyOn(http, "post").mockResolvedValue({
        message: "Terapeuta vinculado ao paciente com sucesso.",
      });

      const resultado = await pacienteService.vincularTerapeuta(
        MOCK_PACIENTE_PEDRO.id,
        {
          terapeuta_id: "terapeuta-uuid-test",
        },
      );

      expect(postSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.TERAPEUTAS(MOCK_PACIENTE_PEDRO.id),
        { terapeuta_id: "terapeuta-uuid-test" },
      );
      expect(resultado.message).toContain("sucesso");
    });

    it("deve desvincular terapeuta via DELETE em ENDPOINTS.PACIENTE.TERAPEUTA_BY_ID", async () => {
      const deleteSpy = vi.spyOn(http, "delete").mockResolvedValue({
        message:
          "Vínculo do terapeuta com o paciente removido com sucesso.",
      });

      const resultado = await pacienteService.desvincularTerapeuta(
        MOCK_PACIENTE_PEDRO.id,
        "terapeuta-uuid-test",
      );

      expect(deleteSpy).toHaveBeenCalledWith(
        ENDPOINTS.PACIENTE.TERAPEUTA_BY_ID(
          MOCK_PACIENTE_PEDRO.id,
          "terapeuta-uuid-test",
        ),
      );
      expect(resultado.message).toContain("sucesso");
    });
  });

  describe("Modo Mock / Fallback Resiliente (Conexão Indisponível)", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(http, "get").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "post").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "put").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "delete").mockRejectedValue(new Error("Network Error"));
      vi.spyOn(http, "patch").mockRejectedValue(new Error("Network Error"));
    });

    it("deve listar pacientes do bdmock filtrando inativos por padrão (RN05)", async () => {
      const resultado = await pacienteService.listar();

      expect(resultado.length).toBeGreaterThan(0);
      expect(resultado.every((p) => p.status_ativo)).toBe(true);
      expect(resultado.some((p) => p.id === MOCK_PACIENTE_PEDRO.id)).toBe(true);
      expect(resultado.some((p) => p.id === MOCK_PACIENTE_SOFIA.id)).toBe(true);
      expect(resultado.some((p) => p.id === MOCK_PACIENTE_LUCAS.id)).toBe(true);
      expect(resultado.some((p) => p.id === MOCK_PACIENTE_INATIVO.id)).toBe(false);
    });

    it("deve incluir pacientes inativos quando solicitado", async () => {
      const resultado = await pacienteService.listar({
        incluirInativos: true,
      });

      expect(resultado.some((p) => p.id === MOCK_PACIENTE_INATIVO.id)).toBe(
        true,
      );
    });

    it("deve filtrar pacientes por nome no fallback", async () => {
      const resultado = await pacienteService.listar({ nome: "Sofia" });

      expect(resultado.length).toBe(1);
      expect(resultado[0].nome).toBe(MOCK_PACIENTE_SOFIA.nome);
    });

    it("deve buscar paciente por ID com dados clínicos e responsáveis completos", async () => {
      const paciente = await pacienteService.buscarPorId(
        MOCK_PACIENTE_PEDRO.id,
      );

      expect(paciente).not.toBeNull();
      expect(paciente?.nome).toBe("Pedro Henrique Silveira");
      expect(paciente?.dados_clinicos?.diagnostico_base).toContain(
        "TEA Nível 1",
      );
      expect(paciente?.responsaveis?.length).toBeGreaterThan(0);
      expect(paciente?.gatilhos?.length).toBeGreaterThan(0);
    });

    it("deve criar novo paciente em memória no fallback", async () => {
      const novo = await pacienteService.criar({
        nome: "Gabriel Teste Mock",
        data_nascimento: "2020-03-10",
        cpf: "999.111.222-33",
        responsavel: {
          nome: "Mãe do Gabriel",
          telefone: "(86) 99999-8888",
        },
        dados_clinicos: {
          diagnostico_base: "TEA Nível 2",
        },
      });

      expect(novo.id).toBeDefined();
      expect(novo.nome).toBe("Gabriel Teste Mock");
      expect(novo.status_ativo).toBe(true);
      expect(novo.responsaveis?.[0].nome).toBe("Mãe do Gabriel");

      const busca = await pacienteService.buscarPorId(novo.id);
      expect(busca?.nome).toBe("Gabriel Teste Mock");
    });

    it("deve atualizar dados do paciente em memória no fallback", async () => {
      const atualizado = await pacienteService.atualizar(
        MOCK_PACIENTE_PEDRO.id,
        {
          cidade: "Parnaíba",
          telefone: "(86) 98888-0000",
        },
      );

      expect(atualizado?.cidade).toBe("Parnaíba");
      expect(atualizado?.telefone).toBe("(86) 98888-0000");
    });

    it("deve inativar (soft delete) e reativar paciente em memória no fallback (RN05)", async () => {
      const inativado = await pacienteService.inativar(MOCK_PACIENTE_PEDRO.id);
      expect(inativado?.status_ativo).toBe(false);

      const reativado = await pacienteService.reativar(MOCK_PACIENTE_PEDRO.id);
      expect(reativado?.status_ativo).toBe(true);
    });

    it("deve vincular e desvincular terapeutas no mock", async () => {
      const terapeutaTesteId = "terapeuta-teste-mock-id";

      const resVinculo = await pacienteService.vincularTerapeuta(
        MOCK_PACIENTE_SOFIA.id,
        { terapeuta_id: terapeutaTesteId },
      );
      expect(resVinculo.message).toContain("sucesso");

      const terapeutas = await pacienteService.listarTerapeutas(
        MOCK_PACIENTE_SOFIA.id,
      );
      expect(
        terapeutas.some((t) => t.terapeuta_id === terapeutaTesteId),
      ).toBe(true);

      const resDesvinculo = await pacienteService.desvincularTerapeuta(
        MOCK_PACIENTE_SOFIA.id,
        terapeutaTesteId,
      );
      expect(resDesvinculo.message).toContain("sucesso");

      const terapeutasApos = await pacienteService.listarTerapeutas(
        MOCK_PACIENTE_SOFIA.id,
      );
      expect(
        terapeutasApos.some((t) => t.terapeuta_id === terapeutaTesteId),
      ).toBe(false);
    });
  });
});
