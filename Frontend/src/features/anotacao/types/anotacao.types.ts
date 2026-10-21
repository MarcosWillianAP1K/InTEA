/**
 * ============================================================================
 * TIPAGENS CANÔNICAS DO DOMÍNIO ANOTAÇÕES CLÍNICAS (InTEA)
 * Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria do Terapeuta),
 *              RN04 (Vínculo Institucional), RN05 (Inalterabilidade / Soft Delete)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface AnotacaoClinica {
  id: string; // UUID
  terapeuta_id: string; // UUID do terapeuta autor
  paciente_id: string; // UUID do paciente
  sessao_id: string | null; // UUID da sessão opcional
  conteudo: string; // Texto clínico
  soft_delete: boolean; // Flag de exclusão lógica (RN05)
  status_ativo: boolean; // Espelho de !soft_delete
  terapeuta_nome?: string;
  paciente_nome?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CriarAnotacaoDTO {
  paciente_id: string;
  conteudo: string;
  sessao_id?: string | null;
  terapeuta_id?: string;
}

export interface AtualizarAnotacaoDTO {
  conteudo?: string;
  soft_delete?: boolean;
  status_ativo?: boolean;
}

export interface FiltroAnotacaoDTO {
  paciente_id?: string;
  sessao_id?: string;
  incluirInativos?: boolean;
  somenteSemSessao?: boolean;
  page?: number;
  limit?: number;
}

export interface AnotacaoRespostaApi {
  data: {
    anotacao: AnotacaoClinica;
  } | AnotacaoClinica;
  message?: string;
}

export interface AnotacoesListaRespostaApi {
  data: {
    anotacoes: AnotacaoClinica[];
    meta?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  } | AnotacaoClinica[];
  total?: number;
  page?: number;
  totalPages?: number;
  message?: string;
}
