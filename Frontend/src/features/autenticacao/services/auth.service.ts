/**
 * ============================================================================
 * REST SERVICE FOR AUTHENTICATION DOMAIN
 * Compliance: RF21, RN04
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  LoginPayload,
  LoginResponse,
  AuthTokens,
  UsuarioAutenticado,
  LogoutResponse,
} from "../types/auth.types";
import {
  loginMock,
  logoutMock,
  refreshMock,
  obterUsuarioAtualMock,
  validarTokenMock,
} from "../types/bdmock";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * Persists authentication tokens securely into browser local storage.
 *
 * @param tokens - Authentication bundle containing access and refresh tokens.
 */
function salvarTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
  } catch {
    // Falha silenciosa em ambientes sem localStorage
  }
}

/**
 * Removes all authentication tokens from local and session storage.
 */
function removerTokens(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  } catch {
    // Falha silenciosa
  }
}

export const authService = {
  /**
   * Performs login authenticating therapist or super admin credentials (RF21).
   * Persists tokens in local storage automatically.
   */
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<LoginResponse>(
          ENDPOINTS.AUTH.LOGIN,
          payload,
        );
        type RawData = {
          tokens?: AuthTokens;
          token?: AuthTokens;
          user?: UsuarioAutenticado;
          access_token?: string;
          refresh_token?: string | null;
          token_type?: string;
          expires_in?: number;
        };
        const dataObj = resposta.data as unknown as RawData | undefined;
        let token: AuthTokens | undefined = dataObj?.token || dataObj?.tokens;

        if (!token && dataObj?.access_token) {
          token = {
            access_token: dataObj.access_token,
            refresh_token: dataObj.refresh_token ?? null,
            token_type: dataObj.token_type || "Bearer",
            expires_in: dataObj.expires_in || 3600,
          };
        }

        if (token) {
          salvarTokens(token);
        }

        return resposta;
      },
      async () => {
        const respostaMock = await loginMock(payload);
        const token = respostaMock.data?.token;
        if (token) {
          salvarTokens(token);
        }
        return respostaMock;
      },
    );
  },

  /**
   * Ends active session and clears local and remote tokens.
   */
  logout: async (): Promise<void> => {
    try {
      await withFallback(
        async () => {
          await http.post<LogoutResponse>(ENDPOINTS.AUTH.LOGOUT);
        },
        async () => {
          await logoutMock();
        },
      );
    } finally {
      removerTokens();
    }
  },

  /**
   * Renews access token using stored refresh token.
   */
  refresh: async (): Promise<AuthTokens> => {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem(REFRESH_TOKEN_KEY) || undefined
        : undefined;

    return await withFallback(
      async () => {
        const resposta = await http.post<{ data: AuthTokens } | AuthTokens>(
          ENDPOINTS.AUTH.REFRESH,
          { refresh_token: refreshToken },
        );
        const tokens =
          "data" in resposta && resposta.data ? resposta.data : (resposta as AuthTokens);
        salvarTokens(tokens);
        return tokens;
      },
      async () => {
        const tokensMock = await refreshMock(refreshToken);
        salvarTokens(tokensMock);
        return tokensMock;
      },
    );
  },

  /**
   * Retrieves profile and clinical metadata of currently authenticated user (RF21, RN04).
   */
  obterUsuarioAtual: async (): Promise<UsuarioAutenticado> => {
    return await withFallback(
      async () => {
        interface RawPerfil {
          id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          registro_profissional?: string | null;
          especialidade?: string | null;
          crefito?: string | null;
          tempo_experiencia_anos?: number;
          clinica_id?: string | null;
          clinica_nome?: string;
          areas_foco?: unknown[];
        }
        interface RawMetadados {
          is_admin?: boolean;
          autenticado?: boolean;
          status_ativo?: boolean;
          created_at?: string | null;
        }
        interface BackendResponse {
          data: {
            perfil?: RawPerfil;
            metadados?: RawMetadados;
          } | UsuarioAutenticado;
        }

        const resposta = await http.get<BackendResponse | UsuarioAutenticado>(
          ENDPOINTS.AUTH.ME,
        );

        if ("data" in resposta && resposta.data) {
          const dataObj = resposta.data as {
            perfil?: RawPerfil;
            metadados?: RawMetadados;
          } & Partial<UsuarioAutenticado>;

          if (dataObj.perfil) {
            const perfil = dataObj.perfil;
            const metadados = dataObj.metadados;
            const isAdmin = Boolean(metadados?.is_admin);
            const usuario: UsuarioAutenticado = {
              id: perfil.id,
              nome: perfil.nome,
              email: perfil.email,
              clinica_id: perfil.clinica_id ?? null,
              clinica_nome: perfil.clinica_nome,
              is_super_admin: isAdmin,
              status_ativo: metadados?.status_ativo ?? true,
              role: isAdmin ? "super_admin" : "terapeuta",
              crefito: perfil.crefito ?? perfil.registro_profissional ?? null,
              registro_profissional: perfil.registro_profissional ?? perfil.crefito ?? null,
              especialidade: perfil.especialidade ?? null,
              telefone: perfil.telefone ?? null,
              tempo_experiencia_anos: perfil.tempo_experiencia_anos,
              areas_foco: (perfil.areas_foco as unknown[]) ?? undefined,
              created_at: metadados?.created_at ?? undefined,
            };
            return usuario;
          }
          return resposta.data as UsuarioAutenticado;
        }
        return resposta as UsuarioAutenticado;
      },
      () => obterUsuarioAtualMock(),
    );
  },

  /**
   * Updates password of authenticated user.
   */
  alterarSenha: async (novaSenha: string): Promise<{ message: string }> => {
    return await http.patch<{ message: string }>(ENDPOINTS.AUTH.ALTERAR_SENHA, { novaSenha });
  },

  estaAutenticado: (): boolean => {
    if (typeof window === "undefined") return false;
    const token =
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem("token") ||
      null;
    return validarTokenMock(token);
  },
};

/**
 * Backwards compatibility for existing test suites
 */
export interface ExemploData {
  id: string;
  titulo: string;
  ativo: boolean;
}

export const exemploService = {
  /**
   * Returns mock items for backwards compatibility in existing tests.
   *
   * @returns Array of mock example items.
   */
  async listar(): Promise<ExemploData[]> {
    return [
      { id: "1", titulo: "Item de Exemplo 1", ativo: true },
      { id: "2", titulo: "Item de Exemplo 2", ativo: false },
    ];
  },
};

export const autenticacaoService = authService;
export default authService;
