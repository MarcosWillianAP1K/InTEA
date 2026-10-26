import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { authService, exemploService } from "../services/auth.service";
import type { LoginResponse, UsuarioAutenticado } from "../types/auth.types";
import { createHttpClient } from "@/shared/utils/request";

describe("Frontend: Autenticação Reativa e useAuth (RF03 / RF21)", () => {
  const mockUsuario: UsuarioAutenticado = {
    id: "user-uuid-123",
    nome: "Dr. Terapeuta Teste",
    email: "terapeuta@intea.com.br",
    clinica_id: "clinica-uuid-456",
    is_super_admin: false,
    status_ativo: true,
    role: "terapeuta",
  };

  const mockTokens = {
    access_token: "mock-access-token-jwt",
    refresh_token: "mock-refresh-token-jwt",
    token_type: "Bearer",
    expires_in: 3600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.getState().limparSessao();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Compatibilidade: ExemploService", () => {
    it("deve listar os dados de exemplo", async () => {
      const dados = await exemploService.listar();
      expect(dados).toBeInstanceOf(Array);
      expect(dados.length).toBeGreaterThan(0);
      expect(dados[0]).toHaveProperty("id");
      expect(dados[0]).toHaveProperty("titulo");
    });
  });

  describe("Hook useAuth (Interface Reativa)", () => {
    it("deve iniciar com estado não autenticado e sem usuário", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.login).toBe("function");
      expect(typeof result.current.logout).toBe("function");
      expect(typeof result.current.refresh).toBe("function");
      expect(typeof result.current.carregarUsuario).toBe("function");
      expect(typeof result.current.limparSessao).toBe("function");
    });

    it("deve refletir autenticação após login bem-sucedido via hook", async () => {
      const loginResponse: LoginResponse = {
        data: {
          token: mockTokens,
          user: mockUsuario,
        },
        message: "Login realizado com sucesso",
      };

      vi.spyOn(authService, "login").mockResolvedValue(loginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login("terapeuta@intea.com.br", "senha123");
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe(mockUsuario.id);
      expect(result.current.user?.email).toBe(mockUsuario.email);
    });

    it("deve limpar estado da sessão ao chamar logout", async () => {
      vi.spyOn(authService, "logout").mockResolvedValue();
      useAuthStore.getState().setUser(mockUsuario);
      useAuthStore.getState().setTokens(mockTokens);

      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it("deve renovar tokens ao invocar refresh via hook", async () => {
      const novosTokens = {
        access_token: "novo-access-token-rotacionado",
        refresh_token: "novo-refresh-token-rotacionado",
        token_type: "Bearer",
        expires_in: 3600,
      };

      vi.spyOn(authService, "refresh").mockResolvedValue(novosTokens);

      const { result } = renderHook(() => useAuth());

      let tokensRetornados: Awaited<ReturnType<typeof authService.refresh>> | null = null;
      await act(async () => {
        tokensRetornados = await result.current.refresh();
      });

      expect(tokensRetornados).toEqual(novosTokens);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("Mecanismo Reativo: Interceptor HTTP com Rotação (RF03)", () => {
    it("deve interceptar 401, renovar o token e re-executar a requisição com sucesso", async () => {
      localStorage.setItem("access_token", "token-antigo-expirado");
      localStorage.setItem("refresh_token", "refresh-token-valido");

      let chamadasEndpoint = 0;
      let refreshChamado = false;

      // Mock global do fetch
      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);

        if (urlStr.includes("/auth/refresh")) {
          refreshChamado = true;
          return new Response(
            JSON.stringify({
              data: {
                token: {
                  access_token: "novo-token-200",
                  refresh_token: "novo-refresh-200",
                  token_type: "Bearer",
                  expires_in: 3600,
                },
              },
              message: "Token renovado com sucesso.",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (urlStr.includes("/paciente")) {
          chamadasEndpoint++;
          const authHeader = (init?.headers as Record<string, string>)?.Authorization;

          if (authHeader === "Bearer token-antigo-expirado") {
            return new Response(JSON.stringify({ error: "Token expirado" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (authHeader === "Bearer novo-token-200") {
            return new Response(
              JSON.stringify({ data: { paciente: { id: "p-1", nome: "Paciente 1" } } }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
        }

        return new Response("Not found", { status: 404 });
      });

      vi.stubGlobal("fetch", mockFetch);

      // Instancia cliente HTTP com os interceptores reativos
      const client = createHttpClient({
        baseURL: "http://localhost:3000/api",
        auth: {
          getAccessToken: () => localStorage.getItem("access_token") || undefined,
          refreshAccessToken: async () => {
            const refreshToken = localStorage.getItem("refresh_token");
            const res = await mockFetch("http://localhost:3000/api/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
            const payload = await res.json();
            const novoToken = payload.data?.token?.access_token;
            const novoRefresh = payload.data?.token?.refresh_token;
            localStorage.setItem("access_token", novoToken);
            localStorage.setItem("refresh_token", novoRefresh);
          },
        },
      });

      const resposta = await client.get<{ data: { paciente: { id: string; nome: string } } }>("/paciente");

      expect(chamadasEndpoint).toBe(2); // 1ª falhou com 401, 2ª refeita com sucesso
      expect(refreshChamado).toBe(true);
      expect(localStorage.getItem("access_token")).toBe("novo-token-200");
      expect(localStorage.getItem("refresh_token")).toBe("novo-refresh-200");
      expect(resposta.data.paciente.nome).toBe("Paciente 1");
    });

    it("deve disparar onAuthFailure e limpar storage caso o refresh_token falhe", async () => {
      localStorage.setItem("access_token", "token-expirado");
      localStorage.setItem("refresh_token", "refresh-invalido-reutilizado");

      let onAuthFailureAcionado = false;

      const mockFetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
        const urlStr = String(input);

        if (urlStr.includes("/auth/refresh")) {
          return new Response(JSON.stringify({ error: "Token inválido ou expirado." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      });

      vi.stubGlobal("fetch", mockFetch);

      const client = createHttpClient({
        baseURL: "http://localhost:3000/api",
        auth: {
          getAccessToken: () => localStorage.getItem("access_token") || undefined,
          refreshAccessToken: async () => {
            const res = await mockFetch("http://localhost:3000/api/auth/refresh", {
              method: "POST",
            });
            if (!res.ok) {
              throw new Error("Falha ao renovar token");
            }
          },
          onAuthFailure: () => {
            onAuthFailureAcionado = true;
            localStorage.clear();
          },
        },
      });

      await expect(client.get("/paciente")).rejects.toThrow();

      expect(onAuthFailureAcionado).toBe(true);
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });
  });
});
