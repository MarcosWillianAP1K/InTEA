/**
 * ============================================================================
 * TIPAGENS CANÔNICAS DO DOMÍNIO TERAPEUTA (InTEA)
 * Conformidade: RF21 (Autoria do Terapeuta), RN04 (Vínculo e Clínica), RN05 (Soft Delete)
 * Regra: TypeScript estrito sem o uso de `any`, snakes_case da API REST
 * ============================================================================
 */

export interface AreaFoco {
  id: string;
  nome: string;
  descricao?: string | null;
}

export interface Terapeuta {
  id: string; // UUID sincronizado com auth.users(id)
  clinica_id: string | null; // UUID da clínica vinculada
  nome: string;
  email: string;
  telefone?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  tempo_experiencia_anos?: number;
  especialidade?: string | null;
  is_super_admin: boolean;
  status_ativo: boolean;
  created_at?: string;
  updated_at?: string;
  areas_foco?: AreaFoco[];
}

export interface CriarTerapeutaDTO {
  nome: string;
  email: string;
  password?: string;
  telefone?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  tempo_experiencia_anos?: number;
  clinica_id?: string | null;
  is_super_admin?: boolean;
  areas_foco_ids?: string[];
}

export interface AtualizarTerapeutaDTO {
  nome?: string;
  telefone?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  tempo_experiencia_anos?: number;
  clinica_id?: string | null;
  status_ativo?: boolean;
  areas_foco_ids?: string[];
}

export interface PerfilTerapeuta extends Terapeuta {
  clinica_nome?: string;
  total_pacientes_vinculados?: number;
  total_sessoes_realizadas?: number;
}

export interface TerapeutaRespostaApi {
  data: Terapeuta;
  message?: string;
}

export interface TerapeutasListaRespostaApi {
  data: Terapeuta[];
}
