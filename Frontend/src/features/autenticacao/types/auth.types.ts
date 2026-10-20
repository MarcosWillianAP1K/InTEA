/**
 * ============================================================================
 * MODELOS CANÔNICOS DE AUTENTICAÇÃO E PERFIL (auth.types.ts)
 * Especificação tipada de credenciais, tokens JWT, sessões e papéis.
 * Conformidade estrita: RF21 (Autenticação e Autoria), RN04 (Clínica e Vínculo)
 * ============================================================================
 */

export type RoleUsuario = "terapeuta" | "super_admin";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  clinica_id: string | null;
  clinica_nome?: string;
  is_super_admin: boolean;
  status_ativo: boolean;
  role: RoleUsuario;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  avatar?: string;
  created_at?: string;
}

export interface PerfilTerapeutaAuth {
  id: string;
  nome: string;
  email: string;
  crefito: string | null;
  especialidade: string | null;
  clinica_id: string | null;
  clinica_nome: string;
  is_super_admin: boolean;
  status_ativo: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  data: {
    user: UsuarioAutenticado;
    tokens: AuthTokens;
  };
  tokens?: AuthTokens;
  user?: UsuarioAutenticado;
  message: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthState {
  user: UsuarioAutenticado | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
