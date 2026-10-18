import {
  createHttpClient,
  type HttpClient,
  type HttpError,
} from "@/shared/utils/request";
import { ENDPOINTS } from "./endpoints";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

const REQUEST_TIMEOUT_MS = 15_000;

export interface TokenRefreshResponse {
  data?: {
    access_token: string;
    refresh_token?: string;
  };
  access_token?: string;
  refresh_token?: string;
}

/**
 * Instância oficial do cliente HTTP da aplicação InTEA.
 * Configurado com base URL, timeout de 15s, CSRF e renovação resiliente de sessão.
 */
export const http: HttpClient = createHttpClient({
  baseURL: API_BASE_URL,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  auth: {
    getAccessToken: () => {
      if (typeof window === "undefined") return undefined;
      return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        undefined
      );
    },
    refreshAccessToken: async () => {
      if (typeof window === "undefined") {
        throw new Error("Ambiente sem acesso ao storage de autenticação.");
      }

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        throw new Error("Refresh token ausente no storage.");
      }

      const refreshUrl = `${API_BASE_URL}${ENDPOINTS.AUTH.REFRESH}`;
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao renovar access token: HTTP ${response.status}`,
        );
      }

      const payload = (await response.json()) as TokenRefreshResponse;
      const newAccessToken = payload.data?.access_token || payload.access_token;
      const newRefreshToken =
        payload.data?.refresh_token || payload.refresh_token;

      if (!newAccessToken) {
        throw new Error("Novo access_token não retornado pelo servidor.");
      }

      localStorage.setItem("access_token", newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem("refresh_token", newRefreshToken);
      }
    },
    onAuthFailure: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    },
  },
});

const rawMockEnv =
  import.meta.env.VITE_USE_MOCK_DATA ?? import.meta.env.VITE_USE_MOCK;
export const USE_MOCK_DATA: boolean =
  rawMockEnv === "true" || rawMockEnv === true;

/**
 * Helper tipado para chamadas seguras à API com suporte a fallback/mock em caso de erro.
 * Se a variável VITE_USE_MOCK_DATA estiver ativa, ou se a requisição à API falhar
 * por problemas de rede, indisponibilidade ou timeout, o valor de fallback fornecido
 * será retornado sem propagar exceção.
 *
 * @param requestFn Função que executa a chamada HTTP (ex: () => http.get<T>(url))
 * @param fallback Valor ou função que fornece os dados simulados
 * @param onError Callback opcional para logging/notificação de erro
 */
export async function withFallback<T>(
  requestFn: () => Promise<T>,
  fallback: T | (() => T | Promise<T>),
  onError?: (error: unknown) => void,
): Promise<T> {
  // Quando ativado globalmente via .env (VITE_USE_MOCK_DATA=true), recorre aos dados mockados
  if (USE_MOCK_DATA && import.meta.env.MODE !== "test") {
    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }

  try {
    return await requestFn();
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      console.warn(
        "[InTEA API] Falha na requisição, utilizando mock/fallback:",
        error,
      );
    }
    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }
}

/**
 * Wrapper conveniente para requisições seguras com parâmetro opcional de fallback.
 */
export async function safeRequest<T>(
  requestFn: () => Promise<T>,
  fallback?: T | (() => T | Promise<T>),
): Promise<T> {
  if (USE_MOCK_DATA && fallback !== undefined && import.meta.env.MODE !== "test") {
    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }

  try {
    return await requestFn();
  } catch (error) {
    if (fallback !== undefined) {
      console.warn(
        "[InTEA API] Conexão indisponível, recorrendo ao fallback:",
        error,
      );
      return typeof fallback === "function"
        ? await (fallback as () => T | Promise<T>)()
        : fallback;
    }
    throw error;
  }
}

export type { HttpClient, HttpError };
export default http;
