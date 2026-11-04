// ==============================================================================
// InTEA: Tipo Compartilhado de Resumo Público do Especialista (RF18 / RN04)
// ==============================================================================

/**
 * Public, sanitized professional summary of a therapist for multidisciplinary
 * session listings and longitudinal patient history (RF18, RNF06).
 * Strictly excludes private credentials, email, and phone numbers.
 */
export interface TerapeutaResumoPublico {
  id: string;
  nome: string;
  especialidade: string | null;
  crefito: string | null;
  registro_profissional: string | null;
}
