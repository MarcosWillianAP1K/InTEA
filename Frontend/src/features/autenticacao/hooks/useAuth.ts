/**
 * ============================================================================
 * HOOK REATIVO DE AUTENTICAÇÃO (useAuth.ts)
 * Facade ergonômica para consumo do estado e ações de autenticação nos componentes.
 * Integrado ao useAuthStore e ao authService.
 * ============================================================================
 */

import { useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import type { LoginPayload, LoginResponse, UsuarioAutenticado, AuthTokens } from "../types/auth.types";

export interface UseAuthReturn {
  user: UsuarioAutenticado | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  carregarUsuario: () => Promise<UsuarioAutenticado | null>;
  refresh: () => Promise<AuthTokens | null>;
  limparSessao: () => void;
}

/**
 * Custom React hook for managing and observing the authentication session.
 *
 * @returns Authentication state controls and observers.
 */
export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  const storeLogin = useAuthStore((s) => s.login);
  const storeLogout = useAuthStore((s) => s.logout);
  const storeCarregarUsuario = useAuthStore((s) => s.carregarUsuario);
  const limparSessao = useAuthStore((s) => s.limparSessao);
  const storeRefresh = useAuthStore((s) => s.refresh);

  /**
   * Realiza login autenticando credenciais do terapeuta contra a API ou fallback mock.
   */
  const login = useCallback(
    async (usernameOrEmail: string, password: string): Promise<LoginResponse> => {
      const payload: LoginPayload = {
        email: usernameOrEmail,
        password,
      };
      return await storeLogin(payload);
    },
    [storeLogin],
  );

  const logout = useCallback(async (): Promise<void> => {
    await storeLogout();
  }, [storeLogout]);

  const carregarUsuario = useCallback(async (): Promise<UsuarioAutenticado | null> => {
    return await storeCarregarUsuario();
  }, [storeCarregarUsuario]);

  const refresh = useCallback(async (): Promise<AuthTokens | null> => {
    return await storeRefresh();
  }, [storeRefresh]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    carregarUsuario,
    limparSessao,
    refresh,
  };
}

export default useAuth;
