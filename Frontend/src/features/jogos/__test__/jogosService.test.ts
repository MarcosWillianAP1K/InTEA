import { describe, it, expect } from "vitest";
import { jogosService, JOGOS_MOCK } from "../services/jogosService";

describe("Jogos Service (jogosService)", () => {
  it("deve listar todos os jogos quando nenhum filtro é aplicado", async () => {
    const jogos = await jogosService.listar({});
    expect(jogos.length).toBe(JOGOS_MOCK.length);
  });

  it("deve filtrar jogos por texto de busca", async () => {
    const jogos = await jogosService.listar({ busca: "Cores" });
    expect(jogos.length).toBeGreaterThan(0);
    expect(jogos.every((j) => j.titulo.includes("Cores"))).toBe(true);
  });

  it("deve filtrar jogos por objetivo terapêutico", async () => {
    const jogos = await jogosService.listar({
      objetivo: "Atenção Compartilhada",
    });
    expect(
      jogos.every((j) => j.objetivoTerapeutico === "Atenção Compartilhada")
    ).toBe(true);
  });

  it("deve buscar jogo por ID com sucesso", async () => {
    const jogo = await jogosService.buscarPorId("jogo-1");
    expect(jogo).not.toBeNull();
    expect(jogo?.titulo).toBe("Aventura das Cores");
  });

  it("deve retornar undefined ao buscar ID inexistente", async () => {
    const jogo = await jogosService.buscarPorId("jogo-inexistente-999");
    expect(jogo).toBeUndefined();
  });
});
