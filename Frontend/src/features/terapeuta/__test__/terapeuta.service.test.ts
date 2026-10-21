import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { terapeutaService } from "../services/terapeuta.service";
import {
  MOCK_TERAPEUTA_MARCOS,
  MOCK_TERAPEUTA_LUMA,
  MOCK_TERAPEUTA_SUPERADMIN,
  MOCK_TERAPEUTA_INATIVO,
  resetarTerapeutasMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Dominio Terapeuta — terapeutaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetarTerapeutasMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve chamar ENDPOINTS.TERAPEUTA.BASE e retornar lista de terapeutas", async () => {
      const mockResposta = {
        data: {
          terapeutas: [MOCK_TERAPEUTA_MARCOS, MOCK_TERAPEUTA_LUMA],
          meta: { total: 2, incluir_inativos: false },
        },
      };

      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockResposta);

      const resultado = await terapeutaService.listar();

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.TERAPEUTA.BASE, {
        params: undefined,
      });
      expect(resultado).toEqual([MOCK_TERAPEUTA_MARCOS, MOCK_TERAPEUTA_LUMA]);
    });

    it("deve passar parâmetro incluirInativos quando solicitado", async () => {
      const mockResposta = {
        data: {
          terapeutas: [MOCK_TERAPEUTA_MARCOS, MOCK_TERAPEUTA_INATIVO],
          meta: { total: 2, incluir_inativos: true },
        },
      };

      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockResposta);

      const resultado = await terapeutaService.listar(true);

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.TERAPEUTA.BASE, {
        params: { incluirInativos: "true" },
      });
      expect(resultado).toEqual([
        MOCK_TERAPEUTA_MARCOS,
        MOCK_TERAPEUTA_INATIVO,
      ]);
    });

    it("deve consultar terapeuta por ID via ENDPOINTS.TERAPEUTA.BY_ID", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: { terapeuta: MOCK_TERAPEUTA_MARCOS } });

      const resultado = await terapeutaService.buscarPorId(
        MOCK_TERAPEUTA_MARCOS.id,
      );

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.TERAPEUTA.BY_ID(MOCK_TERAPEUTA_MARCOS.id),
      );
      expect(resultado).toEqual(MOCK_TERAPEUTA_MARCOS);
    });

    it("deve chamar ENDPOINTS.TERAPEUTA.BASE com POST para criar novo terapeuta", async () => {
      const novoTerapeuta = {
        ...MOCK_TERAPEUTA_LUMA,
        id: "novo-ter-uuid",
        nome: "Dra. Carolina Nova",
      };

      const postSpy = vi
        .spyOn(http, "post")
        .mockResolvedValue({ data: { terapeuta: novoTerapeuta } });

      const dto = {
        nome: "Dra. Carolina Nova",
        email: "carolina.nova@intea.com.br",
        especialidade: "Fonoaudiologia",
      };

      const resultado = await terapeutaService.criar(dto);

      expect(postSpy).toHaveBeenCalledWith(ENDPOINTS.TERAPEUTA.BASE, dto);
      expect(resultado.id).toBe("novo-ter-uuid");
      expect(resultado.nome).toBe("Dra. Carolina Nova");
    });

    it("deve chamar ENDPOINTS.TERAPEUTA.BY_ID com PUT para atualizar dados", async () => {
      const terapeutaAtualizado = {
        ...MOCK_TERAPEUTA_MARCOS,
        telefone: "(86) 91111-9999",
      };

      const putSpy = vi
        .spyOn(http, "put")
        .mockResolvedValue({ data: { terapeuta: terapeutaAtualizado } });

      const dto = { telefone: "(86) 91111-9999" };
      const resultado = await terapeutaService.atualizar(
        MOCK_TERAPEUTA_MARCOS.id,
        dto,
      );

      expect(putSpy).toHaveBeenCalledWith(
        ENDPOINTS.TERAPEUTA.BY_ID(MOCK_TERAPEUTA_MARCOS.id),
        dto,
      );
      expect(resultado?.telefone).toBe("(86) 91111-9999");
    });

    it("deve chamar ENDPOINTS.TERAPEUTA.BY_ID com DELETE para soft delete", async () => {
      const terapeutaInativado = {
        ...MOCK_TERAPEUTA_MARCOS,
        status_ativo: false,
      };

      const deleteSpy = vi
        .spyOn(http, "delete")
        .mockResolvedValue({ data: { terapeuta: terapeutaInativado } });

      const resultado = await terapeutaService.inativar(
        MOCK_TERAPEUTA_MARCOS.id,
      );

      expect(deleteSpy).toHaveBeenCalledWith(
        ENDPOINTS.TERAPEUTA.BY_ID(MOCK_TERAPEUTA_MARCOS.id),
      );
      expect(resultado?.status_ativo).toBe(false);
    });

    it("deve chamar ENDPOINTS.TERAPEUTA.REATIVAR com PATCH para reativação", async () => {
      const terapeutaReativado = {
        ...MOCK_TERAPEUTA_INATIVO,
        status_ativo: true,
      };

      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ data: { terapeuta: terapeutaReativado } });

      const resultado = await terapeutaService.reativar(
        MOCK_TERAPEUTA_INATIVO.id,
      );

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.TERAPEUTA.REATIVAR(MOCK_TERAPEUTA_INATIVO.id),
      );
      expect(resultado?.status_ativo).toBe(true);
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

    it("deve listar terapeutas ativos do bdmock por padrão (RN05)", async () => {
      const terapeutas = await terapeutaService.listar();

      expect(terapeutas.length).toBeGreaterThan(0);
      expect(terapeutas.every((t) => t.status_ativo)).toBe(true);
      expect(
        terapeutas.some((t) => t.id === MOCK_TERAPEUTA_MARCOS.id),
      ).toBe(true);
      expect(terapeutas.some((t) => t.id === MOCK_TERAPEUTA_LUMA.id)).toBe(
        true,
      );
      expect(
        terapeutas.some((t) => t.id === MOCK_TERAPEUTA_SUPERADMIN.id),
      ).toBe(true);
      expect(
        terapeutas.some((t) => t.id === MOCK_TERAPEUTA_INATIVO.id),
      ).toBe(false);
    });

    it("deve incluir terapeutas inativos no mock quando solicitado", async () => {
      const terapeutas = await terapeutaService.listar(true);

      expect(
        terapeutas.some((t) => t.id === MOCK_TERAPEUTA_INATIVO.id),
      ).toBe(true);
    });

    it("deve buscar terapeuta por ID com suas áreas de foco no mock", async () => {
      const terapeuta = await terapeutaService.buscarPorId(
        MOCK_TERAPEUTA_MARCOS.id,
      );

      expect(terapeuta).not.toBeNull();
      expect(terapeuta?.nome).toBe("Dr. Marcos Terapeuta");
      expect(terapeuta?.especialidade).toContain("Integração Sensorial");
      expect(terapeuta?.areas_foco?.length).toBeGreaterThan(0);
    });

    it("deve criar novo terapeuta em memória no fallback", async () => {
      const novo = await terapeutaService.criar({
        nome: "Dra. Joana Terapeuta",
        email: "joana@intea.com.br",
        especialidade: "Fonoaudiologia e Linguagem",
        tempo_experiencia_anos: 7,
      });

      expect(novo.id).toBeDefined();
      expect(novo.nome).toBe("Dra. Joana Terapeuta");
      expect(novo.status_ativo).toBe(true);

      const busca = await terapeutaService.buscarPorId(novo.id);
      expect(busca?.nome).toBe("Dra. Joana Terapeuta");
    });

    it("deve atualizar dados do terapeuta em memória no fallback", async () => {
      const atualizado = await terapeutaService.atualizar(
        MOCK_TERAPEUTA_MARCOS.id,
        {
          telefone: "(86) 98888-7777",
          especialidade: "Terapia Ocupacional Especializada",
        },
      );

      expect(atualizado?.telefone).toBe("(86) 98888-7777");
      expect(atualizado?.especialidade).toBe(
        "Terapia Ocupacional Especializada",
      );
    });

    it("deve inativar e reativar terapeuta em memória no fallback (RN05)", async () => {
      const inativado = await terapeutaService.inativar(
        MOCK_TERAPEUTA_MARCOS.id,
      );
      expect(inativado?.status_ativo).toBe(false);

      const reativado = await terapeutaService.reativar(
        MOCK_TERAPEUTA_MARCOS.id,
      );
      expect(reativado?.status_ativo).toBe(true);
    });
  });
});
