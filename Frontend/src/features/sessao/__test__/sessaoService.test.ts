import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sessaoService } from "../services/sessaoService";

describe("Sessao Service (sessaoService)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("deve retornar erro se o identificador de sessão for vazio", async () => {
    const res = await sessaoService.finalizar("");
    expect(res.sucesso).toBe(false);
    expect(res.error).toContain("Identificador de sessão ausente");
  });

  it("deve enviar requisição PATCH com endpoint e corpo corretos", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "uuid-sessao-1",
          session_token: "849-291",
          status_sessao: "finalizada",
          data_hora_fim: "2026-10-07T23:00:00Z",
        },
      }),
    });
    global.fetch = mockFetch;

    const res = await sessaoService.finalizar("849-291", "Paciente focado.");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/sessao/849-291/finalizar");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({
      anotacoes_clinicas: "Paciente focado.",
    });
    expect(res.sucesso).toBe(true);
    expect(res.data?.status_sessao).toBe("finalizada");
  });

  it("deve tratar resposta de erro do servidor (ex: 400)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "A sessão já se encontra finalizada." }),
    });

    const res = await sessaoService.finalizar("uuid-sessao-1");
    expect(res.sucesso).toBe(false);
    expect(res.error).toBe("A sessão já se encontra finalizada.");
  });

  it("deve tratar erro de rede graciosamente", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Falha na conexão de rede"));

    const res = await sessaoService.finalizar("uuid-sessao-1");
    expect(res.sucesso).toBe(false);
    expect(res.error).toBe("Falha na conexão de rede");
  });
});
