import { describe, it, expect, vi, beforeEach } from "vitest";
import { ENDPOINTS } from "../api/endpoints";
import {
  http,
  withFallback,
  safeRequest,
  API_BASE_URL,
} from "../api/http-client";
import {
  MOCK_CLINICA,
  MOCK_TERAPEUTA_LOGADO,
  MOCK_TERAPEUTA_ADMIN,
} from "@/shared/types";

describe("Fase 1 — Core Infrastructure: endpoints.ts", () => {
  it("deve definir todas as rotas canônicas de AUTH", () => {
    expect(ENDPOINTS.AUTH.LOGIN).toBe("/auth/login");
    expect(ENDPOINTS.AUTH.REFRESH).toBe("/auth/refresh");
    expect(ENDPOINTS.AUTH.LOGOUT).toBe("/auth/logout");
    expect(ENDPOINTS.AUTH.ME).toBe("/auth/me");
  });

  it("deve formatar corretamente as rotas de TERAPEUTA com parâmetros", () => {
    expect(ENDPOINTS.TERAPEUTA.BASE).toBe("/terapeuta");
    expect(ENDPOINTS.TERAPEUTA.BY_ID("uuid-123")).toBe("/terapeuta/uuid-123");
    expect(ENDPOINTS.TERAPEUTA.HARD_DELETE("uuid-123")).toBe(
      "/terapeuta/uuid-123/hard",
    );
    expect(ENDPOINTS.TERAPEUTA.REATIVAR("uuid-123")).toBe(
      "/terapeuta/uuid-123/reativar",
    );
  });

  it("deve formatar corretamente as rotas de PACIENTE com parâmetros e vínculos", () => {
    expect(ENDPOINTS.PACIENTE.BASE).toBe("/paciente");
    expect(ENDPOINTS.PACIENTE.BY_ID("p-1")).toBe("/paciente/p-1");
    expect(ENDPOINTS.PACIENTE.HARD_DELETE("p-1")).toBe("/paciente/p-1/hard");
    expect(ENDPOINTS.PACIENTE.REATIVAR("p-1")).toBe("/paciente/p-1/reativar");
    expect(ENDPOINTS.PACIENTE.TERAPEUTAS("p-1")).toBe(
      "/paciente/p-1/terapeutas",
    );
    expect(ENDPOINTS.PACIENTE.TERAPEUTA_BY_ID("p-1", "t-1")).toBe(
      "/paciente/p-1/terapeutas/t-1",
    );
  });

  it("deve formatar as rotas de JOGOS e MANIFESTO", () => {
    expect(ENDPOINTS.JOGOS.BASE).toBe("/jogos");
    expect(ENDPOINTS.JOGOS.BY_ID("jogo-1")).toBe("/jogos/jogo-1");
    expect(ENDPOINTS.JOGOS.MANIFESTO("jogo-1")).toBe(
      "/jogos/jogo-1/manifesto",
    );
  });

  it("deve formatar todas as rotas de SESSAO clínica e pareamento remoto", () => {
    expect(ENDPOINTS.SESSAO.INICIAR).toBe("/sessao/iniciar");
    expect(ENDPOINTS.SESSAO.BY_ID("sess-1")).toBe("/sessao/sess-1");
    expect(ENDPOINTS.SESSAO.FINALIZAR("sess-1")).toBe(
      "/sessao/sess-1/finalizar",
    );
    expect(ENDPOINTS.SESSAO.CANCELAR("sess-1")).toBe(
      "/sessao/sess-1/cancelar",
    );
    expect(ENDPOINTS.SESSAO.STATUS("sess-1")).toBe("/sessao/sess-1/status");
    expect(ENDPOINTS.SESSAO.RESULTADO("sess-1")).toBe(
      "/sessao/sess-1/resultado",
    );
    expect(ENDPOINTS.SESSAO.EXPORTAR("sess-1")).toBe(
      "/sessao/sess-1/exportar",
    );
    expect(ENDPOINTS.SESSAO.STATUS_BY_TOKEN("849-291")).toBe(
      "/sessao/849-291/status",
    );
    expect(ENDPOINTS.SESSAO.BY_TOKEN("849-291")).toBe(
      "/sessao/token/849-291",
    );
  });

  it("deve formatar as rotas de ANOTACAO clínica", () => {
    expect(ENDPOINTS.ANOTACAO.BASE).toBe("/anotacao");
    expect(ENDPOINTS.ANOTACAO.BY_ID("anot-1")).toBe("/anotacao/anot-1");
    expect(ENDPOINTS.ANOTACAO.HARD_DELETE("anot-1")).toBe(
      "/anotacao/anot-1/hard",
    );
    expect(ENDPOINTS.ANOTACAO.POR_PACIENTE("pac-1")).toBe(
      "/anotacao/paciente/pac-1",
    );
  });
});

describe("Fase 1 — Core Infrastructure: http-client.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("deve exportar instância http configurada com baseURL e métodos HTTP", () => {
    expect(http).toBeDefined();
    expect(typeof http.get).toBe("function");
    expect(typeof http.post).toBe("function");
    expect(typeof http.put).toBe("function");
    expect(typeof http.patch).toBe("function");
    expect(typeof http.delete).toBe("function");
    expect(typeof http.request).toBe("function");
    expect(API_BASE_URL).toContain("/api");
  });

  it("withFallback deve retornar os dados originais quando a promise for bem-sucedida", async () => {
    const fnSucesso = vi.fn().mockResolvedValue({ id: "123", ok: true });
    const fallback = { id: "mock", ok: false };

    const resultado = await withFallback(fnSucesso, fallback);

    expect(resultado).toEqual({ id: "123", ok: true });
    expect(fnSucesso).toHaveBeenCalledTimes(1);
  });

  it("withFallback deve retornar o fallback estático em caso de erro na requisição", async () => {
    const fnErro = vi.fn().mockRejectedValue(new Error("Network Error 500"));
    const fallback = { dados: "mockados" };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resultado = await withFallback(fnErro, fallback);

    expect(resultado).toEqual({ dados: "mockados" });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("withFallback deve executar função geradora de fallback quando fornecida", async () => {
    const fnErro = vi.fn().mockRejectedValue(new Error("Timeout 15000ms"));
    const fallbackFn = vi.fn().mockReturnValue(["item1", "item2"]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resultado = await withFallback(fnErro, fallbackFn);

    expect(resultado).toEqual(["item1", "item2"]);
    expect(fallbackFn).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("safeRequest deve retornar fallback quando fornecido e falha ocorrer", async () => {
    const fnErro = vi.fn().mockRejectedValue(new Error("Conexão recusada"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const resultado = await safeRequest(fnErro, { modo: "offline" });
    expect(resultado).toEqual({ modo: "offline" });

    warnSpy.mockRestore();
  });

  it("safeRequest deve lançar exceção se nenhum fallback for informado", async () => {
    const fnErro = vi.fn().mockRejectedValue(new Error("Falha sem fallback"));
    await expect(safeRequest(fnErro)).rejects.toThrow("Falha sem fallback");
  });
});

describe("Fase 1 — Shared Mocks: bdmock.ts e shared/types", () => {
  it("MOCK_CLINICA deve representar a Clínica Escola UFPI com id e dados válidos", () => {
    expect(MOCK_CLINICA).toBeDefined();
    expect(MOCK_CLINICA.id).toBe("c1111111-1111-4111-8111-111111111111");
    expect(MOCK_CLINICA.nome).toBe("Clínica Escola UFPI");
    expect(MOCK_CLINICA.cnpj).toBe("06.517.387/0001-34");
  });

  it("MOCK_TERAPEUTA_LOGADO deve conter terapeuta ativo associado à clínica e não-admin", () => {
    expect(MOCK_TERAPEUTA_LOGADO).toBeDefined();
    expect(MOCK_TERAPEUTA_LOGADO.id).toBe(
      "a9849163-613f-4492-90cf-89985902d16e",
    );
    expect(MOCK_TERAPEUTA_LOGADO.nome).toBe("Dr. Marcos Terapeuta");
    expect(MOCK_TERAPEUTA_LOGADO.email).toBe("marcos.terapeuta@intea.com.br");
    expect(MOCK_TERAPEUTA_LOGADO.is_super_admin).toBe(false);
    expect(MOCK_TERAPEUTA_LOGADO.status_ativo).toBe(true);
    expect(MOCK_TERAPEUTA_LOGADO.clinica_id).toBe(MOCK_CLINICA.id);
  });

  it("MOCK_TERAPEUTA_ADMIN deve conter perfil SuperAdmin ativo", () => {
    expect(MOCK_TERAPEUTA_ADMIN).toBeDefined();
    expect(MOCK_TERAPEUTA_ADMIN.id).toBe(
      "d2222222-2222-4222-8222-222222222222",
    );
    expect(MOCK_TERAPEUTA_ADMIN.nome).toBe("Admin InTEA");
    expect(MOCK_TERAPEUTA_ADMIN.is_super_admin).toBe(true);
    expect(MOCK_TERAPEUTA_ADMIN.status_ativo).toBe(true);
  });
});
