import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dashboardService } from "../services/dashboard.service";
import {
  MOCK_DASHBOARD_METRICAS,
  MOCK_SESSOES_RECENTES,
  MOCK_ALERTAS_CLINICOS,
  MOCK_ATIVIDADES_RECENTES,
  obterMetricasDashboardMock,
  listarSessoesRecentesMock,
  listarAtividadesRecentesMock,
  listarAlertasClinicosMock,
  marcarAlertaLidoMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Domínio Dashboard — dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve consultar métricas consolidadas via ENDPOINTS.DASHBOARD.METRICAS", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_DASHBOARD_METRICAS });

      const resultado = await dashboardService.obterMetricas();

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.DASHBOARD.METRICAS);
      expect(resultado).toEqual(MOCK_DASHBOARD_METRICAS);
      expect(resultado.taxaRegulacaoDDA).toBeGreaterThan(0);
    });

    it("deve consultar sessões recentes com parâmetro limite", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_SESSOES_RECENTES });

      const resultado = await dashboardService.listarSessoesRecentes(3);

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.DASHBOARD.SESSOES_RECENTES,
        {
          params: { limite: "3" },
        },
      );
      expect(resultado).toEqual(MOCK_SESSOES_RECENTES);
    });

    it("deve consultar atividades recentes via ENDPOINTS.DASHBOARD.ATIVIDADES", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_ATIVIDADES_RECENTES });

      const resultado = await dashboardService.listarAtividadesRecentes(5);

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.DASHBOARD.ATIVIDADES, {
        params: { limite: "5" },
      });
      expect(resultado).toEqual(MOCK_ATIVIDADES_RECENTES);
    });

    it("deve consultar alertas clínicos pendentes", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_ALERTAS_CLINICOS });

      const resultado = await dashboardService.listarAlertas(true);

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.DASHBOARD.ALERTAS, {
        params: { naoLidos: "true" },
      });
      expect(resultado).toEqual(MOCK_ALERTAS_CLINICOS);
    });

    it("deve marcar alerta como lido via ENDPOINTS.DASHBOARD.ALERTA_LIDO", async () => {
      const alertaId = "a1111111-1111-4111-8111-111111111111";
      const patchSpy = vi
        .spyOn(http, "patch")
        .mockResolvedValue({ success: true });

      const resultado = await dashboardService.marcarAlertaLido(alertaId);

      expect(patchSpy).toHaveBeenCalledWith(
        ENDPOINTS.DASHBOARD.ALERTA_LIDO(alertaId),
      );
      expect(resultado).toBe(true);
    });
  });

  describe("Modo Fallback Resiliente (bdmock.ts)", () => {
    it("deve obter métricas do mock quando a API falhar", async () => {
      vi.spyOn(http, "get").mockRejectedValue(new Error("Conexão indisponível"));

      const resultado = await dashboardService.obterMetricas();

      expect(resultado.pacientesAtivos).toBe(
        MOCK_DASHBOARD_METRICAS.pacientesAtivos,
      );
      expect(resultado.sessoesNoMes).toBe(
        MOCK_DASHBOARD_METRICAS.sessoesNoMes,
      );
    });

    it("deve listar sessões recentes via mock respeitando o limite", async () => {
      vi.spyOn(http, "get").mockRejectedValue(new Error("Timeout"));

      const resultado = await dashboardService.listarSessoesRecentes(2);

      expect(resultado.length).toBeLessThanOrEqual(2);
      expect(resultado[0]).toHaveProperty("pacienteNome");
      expect(resultado[0]).toHaveProperty("jogoNome");
    });

    it("deve listar atividades recentes via mock quando a API falhar", async () => {
      vi.spyOn(http, "get").mockRejectedValue(new Error("Serviço indisponível"));

      const resultado = await dashboardService.listarAtividadesRecentes();

      expect(resultado.length).toBeGreaterThan(0);
      expect(resultado[0]).toHaveProperty("tipo");
      expect(resultado[0]).toHaveProperty("titulo");
    });

    it("deve listar alertas via mock quando a API falhar", async () => {
      vi.spyOn(http, "get").mockRejectedValue(new Error("Erro 500"));

      const todos = await dashboardService.listarAlertas(false);
      expect(todos.length).toBeGreaterThan(0);

      const naoLidos = await dashboardService.listarAlertas(true);
      expect(naoLidos.every((a) => !a.lido)).toBe(true);
    });

    it("deve marcar alerta como lido via mock quando a API falhar", async () => {
      vi.spyOn(http, "patch").mockRejectedValue(new Error("Falha HTTP"));

      const sucesso = await dashboardService.marcarAlertaLido(
        "a1111111-1111-4111-8111-111111111111",
      );

      expect(sucesso).toBe(true);
    });
  });

  describe("Helpers Diretos de bdmock.ts", () => {
    it("obterMetricasDashboardMock deve retornar objeto completo de métricas", async () => {
      const metricas = await obterMetricasDashboardMock();
      expect(metricas.pacientesAtivos).toBeDefined();
      expect(metricas.tempoTotalTerapiaMinutos).toBeDefined();
    });

    it("listarSessoesRecentesMock deve respeitar limites", async () => {
      const sessoes = await listarSessoesRecentesMock(1);
      expect(sessoes.length).toBe(1);
    });

    it("listarAtividadesRecentesMock deve retornar feed ordenado", async () => {
      const atividades = await listarAtividadesRecentesMock(2);
      expect(atividades.length).toBeLessThanOrEqual(2);
    });

    it("marcarAlertaLidoMock deve retornar false para alerta inexistente", async () => {
      const resultado = await marcarAlertaLidoMock("id-inexistente");
      expect(resultado).toBe(false);
    });
  });
});
