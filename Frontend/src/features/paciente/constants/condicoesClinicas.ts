export const CONDICOES_CLINICAS = [
  "Dislexia",
  "TEA nível 1",
  "TEA nível 2",
  "TEA nível 3",
  "TDAH",
  "Outro",
] as const;

export type CondicaoClinicaOpcao = (typeof CONDICOES_CLINICAS)[number];

export const ESTADO_CLINICO_NAO_INFORMADO = "Não informado";
export const ULTIMA_SESSAO_VAZIA = "Nenhuma sessão";
export const CONDICAO_NAO_INFORMADA_SELECT = "__nao_informado__";

function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizes a persisted clinical diagnosis string into the canonical dropdown option and custom "Outro" text.
 */
export function normalizarCondicaoParaSelect(valor?: string | null): {
  opcao: CondicaoClinicaOpcao | "";
  textoOutro: string;
} {
  const limpo = typeof valor === "string" ? valor.trim() : "";
  if (!limpo) {
    return { opcao: "", textoOutro: "" };
  }

  const normalizado = removerAcentos(limpo).toLowerCase();
  if (normalizado === removerAcentos(ESTADO_CLINICO_NAO_INFORMADO).toLowerCase()) {
    return { opcao: "", textoOutro: "" };
  }

  const correspondencia = CONDICOES_CLINICAS.find(
    (item) =>
      item !== "Outro" &&
      removerAcentos(item).toLowerCase() === normalizado,
  );

  if (correspondencia) {
    return { opcao: correspondencia, textoOutro: "" };
  }

  return { opcao: "Outro", textoOutro: limpo };
}
