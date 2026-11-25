// ==============================================================================
// InTEA: Tipo Compartilhado de Resumo Público do Especialista
// ==============================================================================

/**
 * Public, sanitized professional summary of a therapist for multidisciplinary
 * session listings and longitudinal patient history.
 * Strictly excludes private credentials, email, and phone numbers.
 */
export interface TerapeutaResumoPublico {
  id: string;
  nome: string;
  especialidade: string | null;
  crefito: string | null;
  registro_profissional: string | null;
}
