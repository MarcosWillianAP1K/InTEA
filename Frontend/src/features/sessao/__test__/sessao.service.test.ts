import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sessaoService } from "../services/sessao.service";
import {
  MOCK_SESSAO_ATIVA,
  MOCK_SESSAO_FINALIZADA,
  MOCK_RESULTADO_SESSAO,
  resetarSessoesMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Domínio Sessão — sessaoService (Clean Architecture)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetarSessoesMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve chamar ENDPOINTS.SESSAO.INICIAR com POST para iniciar sessão", async () => {
      const mockSessao = { ...MOCK_SESSAO_ATIVA, id: "sess-nova-uuid" };
      const postSpy = vi.spyOn(http, "post").mockResolvedValue({ data: mockSessao });

      const dto = {
        jogo_id: "jogo-1",
        paciente_id: "pac-uuid-1",
        codigo_pareamento: "111-222",
      };

      const resultado = await sessaoService.iniciarSessao(dto);

      expect(postSpy).toHaveBeenCalledWith(ENDPOINTS.SESSAO.INICIAR, dto);
      expect(resultado.id).toBe("sess-nova-uuid");
    });

    it("deve buscar sessão por ID via ENDPOINTS.SESSAO.BY_ID", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_SESSAO_ATIVA });

      const resultado = await sessaoService.buscarPorId(MOCK_SESSAO_ATIVA.id);

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.BY_ID(MOCK_SESSAO_ATIVA.id),
      );
      expect(resultado).toEqual(MOCK_SESSAO_ATIVA);
    });

    it("deve buscar sessão por Token via ENDPOINTS.SESSAO.BY_TOKEN", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_SESSAO_ATIVA });

      const resultado = await sessaoService.buscarPorToken("849-291");

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.BY_TOKEN("849-291"),
      );
      expect(resultado?.session_token).toBe("849-291");
    });

    it("deve consultar status por PIN via ENDPOINTS.SESSAO.STATUS_BY_TOKEN", async () => {
      const mockStatus = {
        id: "uuid-1",
        session_token: "849-291",
        status_sessao: "em_andamento",
        modo_sessao: "sessao_clinica",
        dispositivo_conectado: true,
        expirado: false,
      };

      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: mockStatus });

      const resultado = await sessaoService.consultarStatusPorPin("849-291");

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.STATUS_BY_TOKEN("849-291"),
      );
      expect(resultado?.dispositivo_conectado).toBe(true);
    });

    it("deve atualizar status da sessão via ENDPOINTS.SESSAO.STATUS", async () => {
      const sessaoAtualizada = {
        ...MOCK_SESSAO_ATIVA,
        status_sessao: "pausada",
      };

      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ data: sessaoAtualizada });

      const resultado = await sessaoService.atualizarStatus(
        MOCK_SESSAO_ATIVA.id,
        "pausada",
      );

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.STATUS(MOCK_SESSAO_ATIVA.id),
        { status: "pausada" },
      );
      expect(resultado?.status_sessao).toBe("pausada");
    });

    it("deve finalizar sessão via ENDPOINTS.SESSAO.FINALIZAR", async () => {
      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ data: MOCK_RESULTADO_SESSAO });

      const resultado = await sessaoService.finalizarSessao("uuid-sessao-1", {
        anotacoes_clinicas: "Intervenção concluída com sucesso.",
      });

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.FINALIZAR("uuid-sessao-1"),
        { anotacoes_clinicas: "Intervenção concluída com sucesso." },
      );
      expect(resultado.status_sessao).toBe("finalizada");
      expect(resultado.dados_ia).toBeDefined();
    });

    it("deve cancelar sessão via ENDPOINTS.SESSAO.CANCELAR", async () => {
      const deleteSpy = vi
        .spyOn(http, "delete")
        .mockResolvedValue({ sucesso: true, message: "Sessão cancelada" });

      const resultado = await sessaoService.cancelarSessao(
        "uuid-sessao-1",
        "Interrupção pelo paciente",
      );

      expect(deleteSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.CANCELAR("uuid-sessao-1"),
        { data: { motivo: "Interrupção pelo paciente" } },
      );
      expect(resultado.sucesso).toBe(true);
    });

    it("deve obter resultado consolidado da sessão via ENDPOINTS.SESSAO.RESULTADO", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_RESULTADO_SESSAO });

      const resultado = await sessaoService.obterResultado("uuid-sessao-1");

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.SESSAO.RESULTADO("uuid-sessao-1"),
      );
      expect(resultado?.metricas_consolidadas?.taxa_conclusao).toBe(92);
    });

    it("deve listar sessões via ENDPOINTS.SESSAO.BASE com parâmetros de paginação e filtros", async () => {
      const mockResposta = {
        data: [MOCK_SESSAO_ATIVA],
        meta: { total: 1, page: 2, limit: 10, totalPages: 1 },
      };
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue(mockResposta);

      const resultado = await sessaoService.listar({
        page: 2,
        limit: 10,
        status: "concluida",
      });

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.SESSAO.BASE, {
        params: {
          page: "2",
          limit: "10",
          status: "concluida",
        },
      });
      expect(resultado.data.length).toBe(1);
      expect(resultado.meta.page).toBe(2);
      expect(resultado.meta.total).toBe(1);
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

    it("deve iniciar sessão clínica no bdmock gerando session_token e status inicial", async () => {
      const sessao = await sessaoService.iniciarSessao({
        jogo_id: "jogo-1",
        paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        contexto_dda_json: { estresse_inicial: 2 },
      });

      expect(sessao.id).toBeDefined();
      expect(sessao.session_token).toBeDefined();
      expect(sessao.status_sessao).toBe("aguardando_pareamento");
      expect(sessao.paciente_id).toBe("b2c3d4e5-f6a7-8901-bcde-f12345678901");
    });

    it("deve iniciar sessão em Modo Livre com paciente_id nulo e sem DDA (RN01)", async () => {
      const sessao = await sessaoService.iniciarSessao({
        jogo_id: "jogo-1",
        modo_sessao: "modo_livre",
      });

      expect(sessao.modo_sessao).toBe("modo_livre");
      expect(sessao.paciente_id).toBeNull();
      expect(sessao.contexto_dda_json).toBeUndefined();
    });

    it("deve buscar sessão ativa no bdmock por ID", async () => {
      const sessao = await sessaoService.buscarPorId(MOCK_SESSAO_ATIVA.id);

      expect(sessao).not.toBeNull();
      expect(sessao?.session_token).toBe(MOCK_SESSAO_ATIVA.session_token);
      expect(sessao?.status_sessao).toBe("em_andamento");
    });

    it("deve buscar sessão no bdmock por token de pareamento", async () => {
      const sessao = await sessaoService.buscarPorToken("333-444");

      expect(sessao).not.toBeNull();
      expect(sessao?.id).toBe(MOCK_SESSAO_FINALIZADA.id);
    });

    it("deve consultar status e conectividade do dispositivo no bdmock", async () => {
      const status = await sessaoService.consultarStatusPorPin("849-291");

      expect(status).not.toBeNull();
      expect(status?.dispositivo_conectado).toBe(true);
      expect(status?.dispositivo_info?.tipo_dispositivo).toBe("tablet");
    });

    it("deve atualizar status de sessão no bdmock", async () => {
      const atualizada = await sessaoService.atualizarStatus(
        "uuid-sessao-1",
        "pausada",
      );

      expect(atualizada?.status_sessao).toBe("pausada");
    });

    it("deve finalizar sessão no bdmock gerando resultado com telemetria e laudo IA (RF13, RF14)", async () => {
      const resultado = await sessaoService.finalizarSessao(
        "uuid-sessao-1",
        "Excelente foco do paciente.",
      );

      expect(resultado.status_sessao).toBe("finalizada");
      expect(resultado.metricas_consolidadas).toBeDefined();
      expect(resultado.dados_ia?.analises_ia.length).toBeGreaterThan(0);
      expect(resultado.anotacoes?.[0].conteudo).toBe(
        "Excelente foco do paciente.",
      );
    });

    it("deve cancelar sessão no bdmock", async () => {
      const resposta = await sessaoService.cancelarSessao("uuid-sessao-1");

      expect(resposta.sucesso).toBe(true);
      const sessao = await sessaoService.buscarPorId("uuid-sessao-1");
      expect(sessao?.status_sessao).toBe("cancelada");
    });

    it("deve obter resultado consolidado no bdmock", async () => {
      const resultado = await sessaoService.obterResultado("849-291");

      expect(resultado).not.toBeNull();
      expect(resultado?.session_token).toBe("849-291");
      expect(resultado?.metricas_consolidadas?.intervencoes_dda).toBe(3);
    });

    it("deve listar sessões no bdmock aplicando paginação", async () => {
      const resultado = await sessaoService.listar({ page: 1, limit: 2 });

      expect(resultado.data.length).toBeLessThanOrEqual(2);
      expect(resultado.meta.page).toBe(1);
      expect(resultado.meta.limit).toBe(2);
      expect(resultado.meta.total).toBeGreaterThanOrEqual(2);
    });
  });
});
