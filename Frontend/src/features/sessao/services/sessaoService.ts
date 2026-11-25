// Re-exports `sessaoService` and its contracts from `sessao.service.ts` for backward compatibility.

export * from "../types/sessao.types";
export * from "./sessao.service";
export { default as sessaoService } from "./sessao.service";
