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

export const MOCK_USUARIO_HERMESON: UsuarioAutenticado = {
  id: "c4444444-4444-4444-8444-444444444444",
  nome: "Dr. Hermeson Alves",
  email: "hermeson.alves@intea.clinica",
  clinica_id: MOCK_CLINICA.id,
  clinica_nome: MOCK_CLINICA.nome,
  is_super_admin: false,
  status_ativo: true,
  role: "terapeuta",
  crefito: "CREFITO-14/87654-TO",
  registro_profissional: "CREFITO-14/87654-TO",
  especialidade: "Psicomotricidade e Reabilitação Motora",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hermeson",
  created_at: "2026-01-15T09:00:00.000Z",
};

export const MOCK_USUARIO_LUMA: UsuarioAutenticado = {
  id: "b3333333-3333-4333-8333-333333333333",
  nome: "Dra. Luma Maiara",
  email: "luma.maiara@intea.com.br",
  clinica_id: MOCK_CLINICA.id,
  clinica_nome: MOCK_CLINICA.nome,
  is_super_admin: false,
  status_ativo: true,
  role: "terapeuta",
  crefito: "CRP-21/04567",
  registro_profissional: "CRP-21/04567",
  especialidade: "Psicologia Cognitivo-Comportamental e ABA",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=luma",
  created_at: "2026-01-12T14:00:00.000Z",
};

export const MOCK_CREDENCIAIS_VALIDAS = [
  {
    email: "hermeson.alves@intea.clinica",
    senha: "Senha@123",
    usuario: MOCK_USUARIO_HERMESON,
    tokens: MOCK_AUTH_TOKENS,
  },
  {
    email: "marcos.terapeuta@intea.com.br",
    senha: "Senha@123",
    usuario: MOCK_USUARIO_TERAPEUTA,
    tokens: MOCK_AUTH_TOKENS,
  },
  {
    email: "luma.maiara@intea.com.br",
    senha: "Senha@123",
    usuario: MOCK_USUARIO_LUMA,
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

/**
 * Derives a human-friendly professional display name from an email address local part.
 *
 * @param email - User email address.
 * @returns Formatted professional name string (e.g., 'Dr(a). Maria Silva').
 */
function derivarNomeAmigavel(email: string): string {
  const localPart = email.split("@")[0] || "Terapeuta";
  const partes = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase());
  const nomeFormatado = partes.join(" ");
  return nomeFormatado ? `Dr(a). ${nomeFormatado}` : MOCK_USUARIO_TERAPEUTA.nome;
}

// ============================================================================
// HELPERS MOCK EM MEMÓRIA
// ============================================================================

/**
 * Simula o processo de login verificando email e senha.
 */
export async function loginMock(payload: LoginPayload): Promise<LoginResponse> {
  const emailNorm = payload.email.trim().toLowerCase();
  const senha = payload.password;

  // 1. Credencial SuperAdmin
  if (emailNorm === "admin@intea.com.br" && (senha === "Admin@123" || senha.length >= 6)) {
    usuarioLogadoAtual = { ...MOCK_USUARIO_ADMIN };
    tokensAtuais = { ...MOCK_AUTH_TOKENS_ADMIN };
    return {
      data: {
        user: { ...MOCK_USUARIO_ADMIN },
        token: { ...MOCK_AUTH_TOKENS_ADMIN },
      },
      message: "Autenticação realizada com sucesso (SuperAdmin).",
    };
  }

  // 2. Credencial Dr. Hermeson Alves
  if (
    (emailNorm === "hermeson.alves@intea.clinica" ||
      emailNorm === "hermeson.alves@intea.com.br") &&
    senha.length >= 6
  ) {
    usuarioLogadoAtual = { ...MOCK_USUARIO_HERMESON, email: emailNorm };
    tokensAtuais = { ...MOCK_AUTH_TOKENS };
    return {
      data: {
        user: usuarioLogadoAtual,
        token: { ...MOCK_AUTH_TOKENS },
      },
      message: "Autenticação realizada com sucesso.",
    };
  }

  // 3. Credencial Dra. Luma Maiara
  if (
    (emailNorm === "luma.maiara@intea.com.br" ||
      emailNorm === "luma.maiara@intea.clinica") &&
    senha.length >= 6
  ) {
    usuarioLogadoAtual = { ...MOCK_USUARIO_LUMA, email: emailNorm };
    tokensAtuais = { ...MOCK_AUTH_TOKENS };
    return {
      data: {
        user: usuarioLogadoAtual,
        token: { ...MOCK_AUTH_TOKENS },
      },
      message: "Autenticação realizada com sucesso.",
    };
  }

  // 4. Credencial Dr. Marcos Terapeuta
  if (
    (emailNorm === "marcos.terapeuta@intea.com.br" ||
      emailNorm === "marcos.terapeuta@intea.clinica") &&
    senha.length >= 6
  ) {
    usuarioLogadoAtual = { ...MOCK_USUARIO_TERAPEUTA, email: emailNorm };
    tokensAtuais = { ...MOCK_AUTH_TOKENS };
    return {
      data: {
        user: usuarioLogadoAtual,
        token: { ...MOCK_AUTH_TOKENS },
      },
      message: "Autenticação realizada com sucesso.",
    };
  }

  // 5. Qualquer outro e-mail válido em modo mock de desenvolvimento
  if (emailNorm.length > 3 && senha.length >= 6) {
    usuarioLogadoAtual = {
      ...MOCK_USUARIO_TERAPEUTA,
      nome: derivarNomeAmigavel(emailNorm),
      email: emailNorm,
    };
    tokensAtuais = { ...MOCK_AUTH_TOKENS };
    return {
      data: {
        user: usuarioLogadoAtual,
        token: { ...MOCK_AUTH_TOKENS },
      },
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
    data: null,
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
 * Retorna os tokens atualmente ativos no mock em memória.
 */
export function obterTokensAtuaisMock(): AuthTokens | null {
  return tokensAtuais;
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

  if (id === MOCK_USUARIO_HERMESON.id) {
    return {
      id: MOCK_USUARIO_HERMESON.id,
      nome: MOCK_USUARIO_HERMESON.nome,
      email: MOCK_USUARIO_HERMESON.email,
      crefito: MOCK_USUARIO_HERMESON.crefito ?? null,
      especialidade: MOCK_USUARIO_HERMESON.especialidade ?? null,
      clinica_id: MOCK_USUARIO_HERMESON.clinica_id,
      clinica_nome: MOCK_USUARIO_HERMESON.clinica_nome ?? MOCK_CLINICA.nome,
      is_super_admin: false,
      status_ativo: true,
    };
  }

  if (id === MOCK_USUARIO_LUMA.id) {
    return {
      id: MOCK_USUARIO_LUMA.id,
      nome: MOCK_USUARIO_LUMA.nome,
      email: MOCK_USUARIO_LUMA.email,
      crefito: MOCK_USUARIO_LUMA.crefito ?? null,
      especialidade: MOCK_USUARIO_LUMA.especialidade ?? null,
      clinica_id: MOCK_USUARIO_LUMA.clinica_id,
      clinica_nome: MOCK_USUARIO_LUMA.clinica_nome ?? MOCK_CLINICA.nome,
      is_super_admin: false,
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
