const OBJETIVOS_CLINICOS_FORMATADOS: Record<string, string> = {
  foco_atencional: "Foco atencional",
  regulacao_emocional: "Regulação emocional",
  desenvolvimento_linguagem: "Desenvolvimento de linguagem",
  simulacao_rotina: "Simulação de rotina",
  atividades_vida_diaria: "Atividades de vida diária",
  coordenacao_motora: "Coordenação motora",
  interacao_social: "Interação social",
  integracao_sensorial: "Integração sensorial",
};

/**
 * Converts a game manifest `objetivo_clinico` slug (e.g. `foco_atencional`) into a readable label.
 * Preserves strings that are already human-formatted.
 */
export function formatarObjetivoClinico(codigo?: string | null): string {
  const limpo = typeof codigo === "string" ? codigo.trim() : "";
  if (!limpo) return "";

  const chave = limpo.toLowerCase();
  if (OBJETIVOS_CLINICOS_FORMATADOS[chave]) {
    return OBJETIVOS_CLINICOS_FORMATADOS[chave];
  }

  if (limpo.includes("_") || limpo === chave) {
    const legivel = limpo.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    return legivel.replace(/^./, (caractere) => caractere.toUpperCase());
  }

  return limpo;
}
