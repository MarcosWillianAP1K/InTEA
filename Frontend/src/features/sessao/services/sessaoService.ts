/**
 * Re-exporta sessaoService e seus contratos a partir de sessao.service.ts,
 * preservando total retrocompatibilidade com componentes e testes existentes.
 */

export * from "../types/sessao.types";
export * from "./sessao.service";
export { default as sessaoService } from "./sessao.service";
