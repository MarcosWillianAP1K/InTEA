/**
 * ============================================================================
 * FIXTURES E MOCKS DE AUTENTICAÇÃO (bdmock.ts)
 * Simulação determinística de login, refresh de JWT, perfil e logout em memória.
 * Conformidade com RF21 (Autoria) e RN04 (Vínculo com Clínica).
 * ============================================================================
 */

import type {
  UsuarioAutenticado,
  PerfilTerapeutaAuth,
  AuthTokens,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
} from "./auth.types";
import { MOCK_TERAPEUTA_LOGADO, MOCK_TERAPEUTA_ADMIN, MOCK_CLINICA } from "@/shared/types";

// ============================================================================
// FIXTURES DE TOKENS E CREDENCIAIS
// ============================================================================

export const MOCK_AUTH_TOKENS: AuthTokens = {
  access_token: "mock-jwt-intea-access-token-terapeuta-xyz",
  refresh_token: "mock-jwt-intea-refresh-token-terapeuta-abc",
  token_type: "Bearer",
  expires_in: 3600,
};

export const MOCK_AUTH_TOKENS_ADMIN: AuthTokens = {
  access_token: "mock-jwt-intea-access-token-admin-999",
  refresh_token: "mock-jwt-intea-refresh-token-admin-888",
  token_type: "Bearer",
  expires_in: 3600,
};

export const MOCK_USUARIO_TERAPEUTA: UsuarioAutenticado = {
  id: MOCK_TERAPEUTA_LOGADO.id,
  nome: MOCK_TERAPEUTA_LOGADO.nome,
  email: MOCK_TERAPEUTA_LOGADO.email,
  clinica_id: MOCK_CLINICA.id,
  clinica_nome: MOCK_CLINICA.nome,
  is_super_admin: false,
  status_ativo: true,
  role: "terapeuta",
  crefito: MOCK_TERAPEUTA_LOGADO.crefito,
  registro_profissional: MOCK_TERAPEUTA_LOGADO.registro_profissional,
  especialidade: MOCK_TERAPEUTA_LOGADO.especialidade,
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=marcos",
  created_at: MOCK_TERAPEUTA_LOGADO.created_at,
};

export const MOCK_USUARIO_ADMIN: UsuarioAutenticado = {
  id: MOCK_TERAPEUTA_ADMIN.id,
  nome: MOCK_TERAPEUTA_ADMIN.nome,
  email: MOCK_TERAPEUTA_ADMIN.email,
  clinica_id: MOCK_CLINICA.id,
  clinica_nome: MOCK_CLINICA.nome,
  is_super_admin: true,
  status_ativo: true,
  role: "super_admin",
  crefito: MOCK_TERAPEUTA_ADMIN.crefito,
  registro_profissional: MOCK_TERAPEUTA_ADMIN.registro_profissional,
  especialidade: MOCK_TERAPEUTA_ADMIN.especialidade,
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
  created_at: MOCK_TERAPEUTA_ADMIN.created_at,
};

export const MOCK_CREDENCIAIS_VALIDAS = [
  {
    email: "marcos.terapeuta@intea.com.br",
    senha: "Senha@123",
    usuario: MOCK_USUARIO_TERAPEUTA,
    tokens: MOCK_AUTH_TOKENS,
  },
  {
    email: "admin@intea.com.br",
    senha: "Admin@123",
    usuario: MOCK_USUARIO_ADMIN,
    tokens: MOCK_AUTH_TOKENS_ADMIN,
  },
];

// Estado volátil em memória para simulação de sessão
let usuarioLogadoAtual: UsuarioAutenticado | null = { ...MOCK_USUARIO_TERAPEUTA };
let tokensAtuais: AuthTokens | null = { ...MOCK_AUTH_TOKENS };

// ============================================================================
// HELPERS MOCK EM MEMÓRIA
// ============================================================================

/**
 * Simula o processo de login verificando email e senha.
 */
export async function loginMock(payload: LoginPayload): Promise<LoginResponse> {
  const emailNorm = payload.email.trim().toLowerCase();
  const senha = payload.password;

  // Credencial admin
  if (emailNorm === "admin@intea.com.br" && senha === "Admin@123") {
    usuarioLogadoAtual = { ...MOCK_USUARIO_ADMIN };
    tokensAtuais = { ...MOCK_AUTH_TOKENS_ADMIN };
    return {
      data: {
        user: { ...MOCK_USUARIO_ADMIN },
        tokens: { ...MOCK_AUTH_TOKENS_ADMIN },
      },
      tokens: { ...MOCK_AUTH_TOKENS_ADMIN },
      user: { ...MOCK_USUARIO_ADMIN },
      message: "Autenticação realizada com sucesso (SuperAdmin).",
    };
  }

  // Credencial terapeuta padrão ou qualquer email válido em modo mock de desenvolvimento
  if (
    (emailNorm === "marcos.terapeuta@intea.com.br" && senha === "Senha@123") ||
    (emailNorm.length > 3 && senha.length >= 6)
  ) {
    usuarioLogadoAtual = {
      ...MOCK_USUARIO_TERAPEUTA,
      email: emailNorm || MOCK_USUARIO_TERAPEUTA.email,
    };
    tokensAtuais = { ...MOCK_AUTH_TOKENS };
    return {
      data: {
        user: usuarioLogadoAtual,
        tokens: { ...MOCK_AUTH_TOKENS },
      },
      tokens: { ...MOCK_AUTH_TOKENS },
      user: usuarioLogadoAtual,
      message: "Autenticação realizada com sucesso.",
    };
  }

  throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
}

/**
 * Simula logout invalidando a sessão em memória.
 */
export async function logoutMock(): Promise<LogoutResponse> {
  usuarioLogadoAtual = null;
  tokensAtuais = null;
  return {
    success: true,
    message: "Sessão encerrada com sucesso.",
  };
}

/**
 * Simula a renovação de tokens a partir do refresh_token.
 */
export async function refreshMock(refreshToken?: string): Promise<AuthTokens> {
  if (refreshToken && refreshToken.includes("invalido")) {
    throw new Error("Refresh token expirado ou inválido.");
  }

  const novosTokens: AuthTokens = {
    access_token: `mock-jwt-refreshed-${Date.now()}`,
    refresh_token: refreshToken || `mock-refresh-${Date.now()}`,
    token_type: "Bearer",
    expires_in: 3600,
  };

  tokensAtuais = novosTokens;
  return novosTokens;
}

/**
 * Retorna os dados do usuário atualmente autenticado.
 */
export async function obterUsuarioAtualMock(): Promise<UsuarioAutenticado> {
  if (!usuarioLogadoAtual) {
    // Retorna o terapeuta padrão se nenhum foi setado ainda
    return { ...MOCK_USUARIO_TERAPEUTA };
  }
  return { ...usuarioLogadoAtual };
}

/**
 * Retorna o perfil clínico estendido do terapeuta autenticado.
 */
export async function obterPerfilTerapeutaAuthMock(
  id: string,
): Promise<PerfilTerapeutaAuth | null> {
  if (id === MOCK_USUARIO_ADMIN.id) {
    return {
      id: MOCK_USUARIO_ADMIN.id,
      nome: MOCK_USUARIO_ADMIN.nome,
      email: MOCK_USUARIO_ADMIN.email,
      crefito: MOCK_USUARIO_ADMIN.crefito ?? null,
      especialidade: MOCK_USUARIO_ADMIN.especialidade ?? null,
      clinica_id: MOCK_USUARIO_ADMIN.clinica_id,
      clinica_nome: MOCK_USUARIO_ADMIN.clinica_nome ?? MOCK_CLINICA.nome,
      is_super_admin: true,
      status_ativo: true,
    };
  }

  return {
    id: MOCK_USUARIO_TERAPEUTA.id,
    nome: MOCK_USUARIO_TERAPEUTA.nome,
    email: MOCK_USUARIO_TERAPEUTA.email,
    crefito: MOCK_USUARIO_TERAPEUTA.crefito ?? null,
    especialidade: MOCK_USUARIO_TERAPEUTA.especialidade ?? null,
    clinica_id: MOCK_USUARIO_TERAPEUTA.clinica_id,
    clinica_nome: MOCK_USUARIO_TERAPEUTA.clinica_nome ?? MOCK_CLINICA.nome,
    is_super_admin: false,
    status_ativo: true,
  };
}

/**
 * Valida formato sintático de token em ambiente mock.
 */
export function validarTokenMock(token: string | null | undefined): boolean {
  if (!token) return false;
  return token.startsWith("mock-jwt-") || token.length > 20;
}
