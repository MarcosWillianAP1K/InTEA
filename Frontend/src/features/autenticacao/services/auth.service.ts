/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO AUTH (auth.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.AUTH via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade da API.
 * Conformidade: RF21 (Autenticação e Autoria), RN04 (Vínculo e Clínica)
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
 * Utilitário seguro para persistência local de tokens no browser
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
   * Realiza login autenticando credenciais do terapeuta ou super admin (RF21).
   * Persiste os tokens no localStorage automaticamente.
   */
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<LoginResponse>(
          ENDPOINTS.AUTH.LOGIN,
          payload,
        );
        const tokens = resposta.data?.tokens || resposta.tokens;
        if (tokens) {
          salvarTokens(tokens);
        }
        return resposta;
      },
      async () => {
        const respostaMock = await loginMock(payload);
        const tokens = respostaMock.data?.tokens || respostaMock.tokens;
        if (tokens) {
          salvarTokens(tokens);
        }
        return respostaMock;
      },
    );
  },

  /**
   * Encerra a sessão ativa e revoga tokens locais e remotos.
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
   * Renova o token de acesso (access_token) utilizando o refresh_token armazenado.
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
   * Obtém os dados cadastrais e perfil clínico do usuário atualmente autenticado (RF21, RN04).
   */
  obterUsuarioAtual: async (): Promise<UsuarioAutenticado> => {
    return await withFallback(
      async () => {
        const resposta = await http.get<
          { data: UsuarioAutenticado } | UsuarioAutenticado
        >(ENDPOINTS.AUTH.ME);
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as UsuarioAutenticado;
      },
      () => obterUsuarioAtualMock(),
    );
  },

  /**
   * Verifica de forma síncrona se há um token de acesso válido armazenado no cliente.
   */
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
 * Retrocompatibilidade para testes existentes e código legado
 */
export interface ExemploData {
  id: string;
  titulo: string;
  ativo: boolean;
}

export const exemploService = {
  async listar(): Promise<ExemploData[]> {
    return [
      { id: "1", titulo: "Item de Exemplo 1", ativo: true },
      { id: "2", titulo: "Item de Exemplo 2", ativo: false },
    ];
  },
};

export default authService;
