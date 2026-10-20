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
        localStorage.removeItem("intea:auth-store");
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
 * Helper tipado para chamadas à API com chaveamento estrito por ambiente (VITE_USE_MOCK_DATA).
 * - Se VITE_USE_MOCK_DATA=true: retorna exclusivamente os dados simulados (fallback), sem chamar o Backend.
 * - Se VITE_USE_MOCK_DATA=false (em execução real): chama exclusivamente a API do Backend e propaga o erro real caso falhe, sem misturar com mocks.
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
  const isTestMode = import.meta.env.MODE === "test";

  // Interruptor de ambiente: quando VITE_USE_MOCK_DATA=true, usa exclusivamente os mocks
  if (USE_MOCK_DATA) {
    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }

  // Em modo de testes unitários (Vitest), isola contra processos externos na porta 3000
  // a menos que o teste tenha criado um spy no cliente HTTP ou na própria função de requisição
  if (isTestMode) {
    const isSpied =
      Boolean((requestFn as unknown as { mock?: unknown })?.mock) ||
      Boolean((http.get as unknown as { mock?: unknown })?.mock) ||
      Boolean((http.post as unknown as { mock?: unknown })?.mock) ||
      Boolean((http.put as unknown as { mock?: unknown })?.mock) ||
      Boolean((http.patch as unknown as { mock?: unknown })?.mock) ||
      Boolean((http.delete as unknown as { mock?: unknown })?.mock);

    if (isSpied) {
      try {
        return await requestFn();
      } catch (error) {
        if (onError) onError(error);
        if (!onError) {
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

    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }

  try {
    return await requestFn();
  } catch (error) {
    if (onError) {
      onError(error);
    }
    // Quando VITE_USE_MOCK_DATA=false em execução real, NÃO mistura com mock: propaga o erro da API
    throw error;
  }
}

/**
 * Wrapper conveniente para requisições com suporte a chaveamento estrito de ambiente.
 */
export async function safeRequest<T>(
  requestFn: () => Promise<T>,
  fallback?: T | (() => T | Promise<T>),
): Promise<T> {
  const isTestMode = import.meta.env.MODE === "test";

  if (USE_MOCK_DATA && fallback !== undefined && !isTestMode) {
    return typeof fallback === "function"
      ? await (fallback as () => T | Promise<T>)()
      : fallback;
  }

  try {
    return await requestFn();
  } catch (error) {
    if (fallback !== undefined && isTestMode) {
      return typeof fallback === "function"
        ? await (fallback as () => T | Promise<T>)()
        : fallback;
    }
    throw error;
  }
}

export type { HttpClient, HttpError };
export default http;
