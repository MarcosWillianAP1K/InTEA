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

/**
 * Normaliza eventual estrutura aninhada `{ user: { ... } }` persistida no localStorage
 * garantindo que `state.user` tenha sempre as propriedades na raiz (`id`, `nome`, `email`).
 */
function normalizarUsuarioStore(raw: unknown): UsuarioAutenticado | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if ("user" in obj && obj.user && typeof obj.user === "object") {
    const u = obj.user as Record<string, unknown>;
    const isAdmin = Boolean(u.is_super_admin ?? u.is_admin);
    return {
      ...(u as unknown as UsuarioAutenticado),
      is_super_admin: isAdmin,
      role:
        u.role === "super_admin" || isAdmin ? "super_admin" : "terapeuta",
    };
  }
  return raw as UsuarioAutenticado;
}

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
          let usuario = normalizarUsuarioStore(resposta.data?.user || null);
          const tokens = resposta.data?.token || null;

          if (!usuario && tokens?.access_token) {
            try {
              usuario = normalizarUsuarioStore(
                await authService.obterUsuarioAtual(),
              );
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
        } catch {
          get().limparSessao();
          return null;
        }
      },

      carregarUsuario: async (): Promise<UsuarioAutenticado | null> => {
        set({ loading: true });
        try {
          const usuario = normalizarUsuarioStore(
            await authService.obterUsuarioAtual(),
          );
          set({ user: usuario, isAuthenticated: true, loading: false });
          return usuario;
        } catch {
          set({ loading: false });
          return null;
        }
      },

      setUser: (user: UsuarioAutenticado | null) => {
        const normalizado = normalizarUsuarioStore(user);
        set({ user: normalizado, isAuthenticated: !!normalizado });
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
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          const normalizado = normalizarUsuarioStore(state.user);
          if (normalizado !== state.user) {
            state.setUser(normalizado);
          }
        }
      },
    },
  ),
);

export default useAuthStore;
