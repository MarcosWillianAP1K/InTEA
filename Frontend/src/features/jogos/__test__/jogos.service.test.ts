import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jogosService } from "../services/jogos.service";
import {
  MOCK_JOGO_AVENTURA_CORES,
  MOCK_JOGO_ILHA_SENTIDOS,
  MOCK_JOGO_LABIRINTO_EMOJIS,
  JOGOS_MOCK,
  resetarJogosMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Domínio Jogos — jogosService (Clean Architecture)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetarJogosMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve chamar ENDPOINTS.JOGOS.BASE e retornar lista de jogos", async () => {
      const mockResposta = {
        data: [MOCK_JOGO_AVENTURA_CORES, MOCK_JOGO_ILHA_SENTIDOS],
      };

      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockResposta);

      const resultado = await jogosService.listar();

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.JOGOS.BASE, {
        params: undefined,
      });
      expect(resultado).toEqual([
        MOCK_JOGO_AVENTURA_CORES,
        MOCK_JOGO_ILHA_SENTIDOS,
      ]);
    });

    it("deve serializar e passar filtros de busca e objetivo na query da requisição", async () => {
      const mockResposta = [MOCK_JOGO_ILHA_SENTIDOS];
      const getSpy = vi.spyOn(http, "get").mockResolvedValue(mockResposta);

      const resultado = await jogosService.listar({
        busca: "Ilha",
        objetivo: "Integração Sensorial",
      });

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.JOGOS.BASE, {
        params: {
          busca: "Ilha",
          objetivo: "Integração Sensorial",
        },
      });
      expect(resultado).toEqual([MOCK_JOGO_ILHA_SENTIDOS]);
    });

    it("deve buscar jogo por ID via ENDPOINTS.JOGOS.BY_ID", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_JOGO_AVENTURA_CORES });

      const resultado = await jogosService.buscarPorId("jogo-1");

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.JOGOS.BY_ID("jogo-1"));
      expect(resultado).toEqual(MOCK_JOGO_AVENTURA_CORES);
    });

    it("deve obter o manifesto técnico e clínico via ENDPOINTS.JOGOS.MANIFESTO", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_JOGO_ILHA_SENTIDOS.manifesto });

      const resultado = await jogosService.obterManifesto("jogo-4");

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.JOGOS.MANIFESTO("jogo-4"));
      expect(resultado?.nome).toBe("Ilha dos Sentidos");
      expect(resultado?.metricasSuportadas.length).toBeGreaterThan(0);
    });

    it("deve retornar null diretamente se o ID for vazio ou inválido", async () => {
      const getSpy = vi.spyOn(http, "get");

      const resultado = await jogosService.buscarPorId("   ");
      expect(resultado).toBeNull();
      expect(getSpy).not.toHaveBeenCalled();

      const resultadoManifesto = await jogosService.obterManifesto("");
      expect(resultadoManifesto).toBeNull();
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  describe("Modo Mock / Fallback Resiliente (Conexão Indisponível)", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(http, "get").mockRejectedValue(new Error("Network Error"));
    });

    it("deve listar todos os jogos do bdmock quando o backend estiver fora do ar", async () => {
      const jogos = await jogosService.listar();

      expect(jogos.length).toBe(JOGOS_MOCK.length);
      expect(jogos.some((j) => j.id === "jogo-1")).toBe(true);
      expect(jogos.some((j) => j.id === "jogo-4")).toBe(true);
      expect(jogos.some((j) => j.id === "jogo-5")).toBe(true);
    });

    it("deve filtrar jogos por texto no bdmock", async () => {
      const jogos = await jogosService.listar({ busca: "Emojis" });

      expect(jogos.length).toBe(1);
      expect(jogos[0].id).toBe(MOCK_JOGO_LABIRINTO_EMOJIS.id);
    });

    it("deve filtrar jogos por objetivo terapêutico no bdmock", async () => {
      const jogos = await jogosService.listar({
        objetivo: "Integração Sensorial",
      });

      expect(
        jogos.every((j) => j.objetivoTerapeutico === "Integração Sensorial"),
      ).toBe(true);
      expect(jogos.some((j) => j.id === "jogo-4")).toBe(true);
    });

    it("deve buscar jogo por ID no bdmock", async () => {
      const jogo = await jogosService.buscarPorId("jogo-4");

      expect(jogo).not.toBeNull();
      expect(jogo?.titulo).toBe("Ilha dos Sentidos");
      expect(jogo?.manifesto.metricasSuportadas.length).toBe(3);
    });

    it("deve retornar null no bdmock para ID inexistente", async () => {
      const jogo = await jogosService.buscarPorId("jogo-inexistente-xyz");

      expect(jogo).toBeNull();
    });

    it("deve obter manifesto técnico completo do jogo no bdmock", async () => {
      const manifesto = await jogosService.obterManifesto("jogo-5");

      expect(manifesto).not.toBeNull();
      expect(manifesto?.nome).toBe("Labirinto dos Emojis");
      expect(manifesto?.metricasSuportadas.some((m) => m.tipo === "tempo")).toBe(
        true,
      );
    });
  });
});
