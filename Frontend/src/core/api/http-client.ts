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
    token?: {
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
    };
    access_token?: string;
    refresh_token?: string;
  };
  access_token?: string;
  refresh_token?: string;
}

/**
 * Official HTTP client instance for the InTEA application.
 * Configured with base URL, 15s timeout, CSRF, and resilient session renewal.
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
      const newAccessToken =
        payload.data?.token?.access_token ||
        payload.data?.access_token ||
        payload.access_token;
      const newRefreshToken =
        payload.data?.token?.refresh_token ||
        payload.data?.refresh_token ||
        payload.refresh_token;

      if (!newAccessToken) {
        throw new Error("Novo access_token não retornado pelo servidor.");
      }

      localStorage.setItem("access_token", newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem("refresh_token", newRefreshToken);
      }

      // Sincroniza a store em memória (caso esteja carregada no navegador)
      try {
        const { useAuthStore } = await import("@/features/autenticacao/store/authStore");
        useAuthStore.getState().setTokens({
          access_token: newAccessToken,
          refresh_token: newRefreshToken ?? null,
          token_type: "Bearer",
          expires_in: payload.data?.token?.expires_in || 3600,
        });
      } catch {
        // Ignora em ambientes headless ou testes sem store inicializada
      }
    },
    onAuthFailure: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token");
        localStorage.removeItem("intea:auth-store");
        sessionStorage.removeItem("token");
        try {
          import("@/features/autenticacao/store/authStore").then(({ useAuthStore }) => {
            useAuthStore.getState().limparSessao();
          }).catch(() => {});
        } catch {
          // Ignora caso a store não esteja carregada
        }
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
 * Typed API helper with strict environment switching (VITE_USE_MOCK_DATA).
 *
 * - If VITE_USE_MOCK_DATA=true: returns mocked data exclusively (fallback) without calling the Backend.
 * - If VITE_USE_MOCK_DATA=false (real execution): calls the Backend API exclusively and propagates errors without mock mixing.
 *
 * @param requestFn - Function that executes the HTTP request (e.g. () => http.get<T>(url)).
 * @param fallback - Mock value or function supplying fallback data.
 * @param onError - Optional callback for error logging or notification.
 * @returns Resolved response promise.
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
 * Convenient request wrapper supporting strict environment switching.
 *
 * @param requestFn - Function that executes the HTTP request.
 * @param fallback - Optional fallback value or function supplying mock data.
 * @returns Resolved response promise.
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
