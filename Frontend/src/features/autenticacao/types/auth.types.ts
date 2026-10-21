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
  telefone?: string | null;
  tempo_experiencia_anos?: number;
  areas_foco?: unknown[];
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

/** POST /auth/login → `{ data: { token }, message }` (user vem de /auth/me; opcional no fallback mock). */
export interface LoginResponse {
  data: {
    token: AuthTokens;
    user?: UsuarioAutenticado;
  };
  message: string;
}

/** POST /auth/refresh → `{ data: { token }, message }` */
export interface RefreshRespostaApi {
  data: {
    token: AuthTokens;
  };
  message: string;
}

/** Backend devolve em /auth/me um perfil com `is_admin` em vez de `is_super_admin`. */
export type UsuarioApi = Omit<UsuarioAutenticado, "is_super_admin"> & {
  is_super_admin?: boolean;
  is_admin?: boolean;
};

/** GET /auth/me → `{ data: { user }, message }` */
export interface UsuarioAtualRespostaApi {
  data: {
    user: UsuarioApi;
  };
  message: string;
}

/** POST /auth/logout e PATCH /auth/alterar-senha → `{ data: null, message }` */
export interface LogoutResponse {
  data: null;
  message: string;
}

export type AlterarSenhaRespostaApi = LogoutResponse;

/** POST /auth/recuperar-senha → `{ data: { recuperacao }, message }` */
export interface RecuperarSenhaRespostaApi {
  data: {
    recuperacao: {
      email: string;
      solicitado: boolean;
    };
  };
  message: string;
}

export interface AuthState {
  user: UsuarioAutenticado | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
