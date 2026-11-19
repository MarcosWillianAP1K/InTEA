import { describe, it, expect } from "vitest";
import { formatarObjetivoClinico } from "../utils/formatarObjetivoClinico";

describe("formatarObjetivoClinico", () => {
  it("converte códigos snake_case conhecidos com acentuação adequada", () => {
    expect(formatarObjetivoClinico("foco_atencional")).toBe("Foco atencional");
    expect(formatarObjetivoClinico("regulacao_emocional")).toBe("Regulação emocional");
    expect(formatarObjetivoClinico("desenvolvimento_linguagem")).toBe("Desenvolvimento de linguagem");
    expect(formatarObjetivoClinico("simulacao_rotina")).toBe("Simulação de rotina");
    expect(formatarObjetivoClinico("atividades_vida_diaria")).toBe("Atividades de vida diária");
  });

  it("converte códigos snake_case novos usando fallback genérico legível", () => {
    expect(formatarObjetivoClinico("flexibilidade_cognitiva")).toBe("Flexibilidade cognitiva");
    expect(formatarObjetivoClinico("autonomia")).toBe("Autonomia");
  });

  it("preserva rótulos que já chegam formatados com maiúsculas e espaços", () => {
    expect(formatarObjetivoClinico("Atenção Compartilhada")).toBe("Atenção Compartilhada");
    expect(formatarObjetivoClinico("Integração Sensorial")).toBe("Integração Sensorial");
  });

  it("retorna string vazia para entradas nulas ou em branco", () => {
    expect(formatarObjetivoClinico(null)).toBe("");
    expect(formatarObjetivoClinico(undefined)).toBe("");
    expect(formatarObjetivoClinico("   ")).toBe("");
  });
});
