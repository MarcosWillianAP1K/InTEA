/**
 * ============================================================================
 * STORE REATIVA DE AUTENTICAÇÃO (Zustand) — InTEA
 * Gerenciamento centralizado de sessão, tokens JWT e perfil do usuário ativo.
 * Conformidade com RF21 (Autenticação/Autoria) e RN04 (Vínculo com Clínica).
 * TypeScript estrito sem o uso de `any`.
 * ============================================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UsuarioAutenticado,
  AuthTokens,
  LoginPayload,
  LoginResponse,
} from "../types/auth.types";
import { authService } from "../services/auth.service";

export interface AuthStoreState {
  user: UsuarioAutenticado | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Ações de Autenticação
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthTokens | null>;
  carregarUsuario: () => Promise<UsuarioAutenticado | null>;
  setUser: (user: UsuarioAutenticado | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setError: (error: string | null) => void;
  limparSessao: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (payload: LoginPayload): Promise<LoginResponse> => {
        set({ loading: true, error: null });
        try {
          const resposta = await authService.login(payload);
          let usuario = resposta.data?.user || resposta.user || null;
          const tokens = resposta.data?.tokens || resposta.tokens || null;

          if (!usuario && tokens?.access_token) {
            try {
              usuario = await authService.obterUsuarioAtual();
            } catch {
              // Mantém usuário null se falhar ao obter perfil
            }
          }

          set({
            user: usuario,
            tokens,
            isAuthenticated: !!tokens?.access_token,
            loading: false,
            error: null,
          });

          return resposta;
        } catch (erro) {
          const mensagem =
            erro instanceof Error
              ? erro.message
              : "Falha ao realizar autenticação no sistema.";
          set({ loading: false, error: mensagem, isAuthenticated: false });
          throw erro;
        }
      },

      logout: async (): Promise<void> => {
        set({ loading: true });
        try {
          await authService.logout();
        } finally {
          get().limparSessao();
        }
      },

      refresh: async (): Promise<AuthTokens | null> => {
        try {
          const tokens = await authService.refresh();
          set({ tokens, isAuthenticated: true });
          return tokens;
        } catch (erro) {
          get().limparSessao();
          return null;
        }
      },

      carregarUsuario: async (): Promise<UsuarioAutenticado | null> => {
        set({ loading: true });
        try {
          const usuario = await authService.obterUsuarioAtual();
          set({ user: usuario, isAuthenticated: true, loading: false });
          return usuario;
        } catch (erro) {
          set({ loading: false });
          return null;
        }
      },

      setUser: (user: UsuarioAutenticado | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setTokens: (tokens: AuthTokens | null) => {
        set({ tokens, isAuthenticated: !!tokens?.access_token });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      limparSessao: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: "intea:auth-store",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
