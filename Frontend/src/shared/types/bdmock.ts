/**
 * ============================================================================
 * FIXTURES E MOCKS COMPARTILHADOS (InTEA Core Mocks)
 * Modelos de dados e fixtures globais de Clínica, Terapeuta e SuperAdmin.
 * ============================================================================
 */

export interface Clinica {
  id: string;
  nome: string;
  cnpj?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AreaFoco {
  id: string;
  nome: string;
  descricao?: string | null;
}

export interface Terapeuta {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  tempo_experiencia_anos?: number;
  clinica_id: string | null;
  is_super_admin: boolean;
  status_ativo: boolean;
  created_at?: string;
  updated_at?: string;
  areas_foco?: AreaFoco[];
}

export const MOCK_CLINICA: Clinica = {
  id: "c1111111-1111-4111-8111-111111111111",
  nome: "Clínica Escola UFPI",
  cnpj: "06.517.387/0001-34",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const MOCK_TERAPEUTA_LOGADO: Terapeuta = {
  id: "a9849163-613f-4492-90cf-89985902d16e",
  nome: "Dr. Marcos Terapeuta",
  email: "marcos.terapeuta@intea.com.br",
  telefone: "(86) 99999-1234",
  crefito: "CREFITO-14/12345-TO",
  registro_profissional: "CREFITO-14/12345-TO",
  especialidade: "Terapia Ocupacional e Integração Sensorial",
  tempo_experiencia_anos: 6,
  clinica_id: "c1111111-1111-4111-8111-111111111111",
  is_super_admin: false,
  status_ativo: true,
  created_at: "2026-01-10T10:00:00.000Z",
  updated_at: "2026-01-10T10:00:00.000Z",
};

export const MOCK_TERAPEUTA_ADMIN: Terapeuta = {
  id: "d2222222-2222-4222-8222-222222222222",
  nome: "Admin InTEA",
  email: "admin@intea.com.br",
  telefone: "(86) 98888-5678",
  crefito: "CREFITO-14/99999-TO",
  registro_profissional: "CREFITO-14/99999-TO",
  especialidade: "SuperAdmin do Sistema",
  tempo_experiencia_anos: 12,
  clinica_id: "c1111111-1111-4111-8111-111111111111",
  is_super_admin: true,
  status_ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
