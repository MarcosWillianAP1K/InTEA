import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authService } from "../services/auth.service";
import {
  MOCK_USUARIO_TERAPEUTA,
  MOCK_AUTH_TOKENS,
  loginMock,
  logoutMock,
  refreshMock,
  obterUsuarioAtualMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Domínio Auth — authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve realizar login via ENDPOINTS.AUTH.LOGIN e armazenar tokens", async () => {
      const payloadLogin = {
        email: "marcos.terapeuta@intea.com.br",
        password: "Senha@123",
      };
      const mockResposta = {
        data: {
          user: MOCK_USUARIO_TERAPEUTA,
          tokens: MOCK_AUTH_TOKENS,
        },
        message: "Autenticação bem-sucedida",
      };

      const postSpy = vi.spyOn(http, "post").mockResolvedValue(mockResposta);

      const resultado = await authService.login(payloadLogin);

      expect(postSpy).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.LOGIN,
        payloadLogin,
      );
      expect(resultado).toEqual(mockResposta);
      expect(localStorage.getItem("access_token")).toBe(
        MOCK_AUTH_TOKENS.access_token,
      );
      expect(localStorage.getItem("refresh_token")).toBe(
        MOCK_AUTH_TOKENS.refresh_token,
      );
    });

    it("deve chamar ENDPOINTS.AUTH.LOGOUT e limpar storage no logout", async () => {
      localStorage.setItem("access_token", "token-ativo");
      localStorage.setItem("refresh_token", "refresh-ativo");

      const postSpy = vi.spyOn(http, "post").mockResolvedValue({
        success: true,
        message: "Logout realizado",
      });

      await authService.logout();

      expect(postSpy).toHaveBeenCalledWith(ENDPOINTS.AUTH.LOGOUT);
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    it("deve renovar token via ENDPOINTS.AUTH.REFRESH", async () => {
      localStorage.setItem(
        "refresh_token",
        MOCK_AUTH_TOKENS.refresh_token as string,
      );
      const novosTokens = {
        access_token: "novo-access-token",
        refresh_token: "novo-refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      const postSpy = vi
        .spyOn(http, "post")
        .mockResolvedValue({ data: novosTokens });

      const resultado = await authService.refresh();

      expect(postSpy).toHaveBeenCalledWith(ENDPOINTS.AUTH.REFRESH, {
        refresh_token: MOCK_AUTH_TOKENS.refresh_token,
      });
      expect(resultado).toEqual(novosTokens);
      expect(localStorage.getItem("access_token")).toBe("novo-access-token");
    });

    it("deve obter perfil do usuário logado via ENDPOINTS.AUTH.ME", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_USUARIO_TERAPEUTA });

      const resultado = await authService.obterUsuarioAtual();

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.AUTH.ME);
      expect(resultado).toEqual(MOCK_USUARIO_TERAPEUTA);
    });
  });

  describe("Modo Fallback Resiliente (bdmock.ts)", () => {
    it("deve autenticar com sucesso usando bdmock quando a API falhar", async () => {
      vi.spyOn(http, "post").mockRejectedValue(new Error("Conexão indisponível"));

      const resultado = await authService.login({
        email: "marcos.terapeuta@intea.com.br",
        password: "Senha@123",
      });

      expect(resultado.data.user?.email).toBe("marcos.terapeuta@intea.com.br");
      expect(localStorage.getItem("access_token")).toBe(
        MOCK_AUTH_TOKENS.access_token,
      );
    });

    it("deve autenticar super admin usando bdmock quando a API falhar", async () => {
      vi.spyOn(http, "post").mockRejectedValue(new Error("Conexão indisponível"));

      const resultado = await authService.login({
        email: "admin@intea.com.br",
        password: "Admin@123",
      });

      expect(resultado.data.user?.is_super_admin).toBe(true);
      expect(resultado.data.user?.role).toBe("super_admin");
    });

    it("deve rejeitar credenciais inválidas no fallback mock", async () => {
      vi.spyOn(http, "post").mockRejectedValue(new Error("Falha HTTP"));

      await expect(
        authService.login({
          email: "invalido",
          password: "123",
        }),
      ).rejects.toThrow();
    });

    it("deve executar logout com bdmock e limpar localStorage", async () => {
      localStorage.setItem("access_token", "mock-jwt-teste");
      vi.spyOn(http, "post").mockRejectedValue(new Error("Falha de rede"));

      await authService.logout();

      expect(localStorage.getItem("access_token")).toBeNull();
    });

    it("deve renovar token via bdmock quando a API falhar", async () => {
      vi.spyOn(http, "post").mockRejectedValue(new Error("Falha de rede"));

      const tokens = await authService.refresh();

      expect(tokens.access_token).toBeDefined();
      expect(tokens.token_type).toBe("Bearer");
    });

    it("deve obter usuário atual via bdmock quando a API falhar", async () => {
      vi.spyOn(http, "get").mockRejectedValue(new Error("Falha de rede"));

      const usuario = await authService.obterUsuarioAtual();

      expect(usuario.id).toBe(MOCK_USUARIO_TERAPEUTA.id);
      expect(usuario.nome).toBe(MOCK_USUARIO_TERAPEUTA.nome);
    });
  });

  describe("Verificação de Sessão Local (estaAutenticado)", () => {
    it("deve retornar false quando não houver token no localStorage", () => {
      expect(authService.estaAutenticado()).toBe(false);
    });

    it("deve retornar true quando houver token válido no localStorage", () => {
      localStorage.setItem("access_token", MOCK_AUTH_TOKENS.access_token);
      expect(authService.estaAutenticado()).toBe(true);
    });
  });

  describe("Helpers Diretos de bdmock", () => {
    it("loginMock deve autenticar terapeuta e super admin", async () => {
      const resTerapeuta = await loginMock({
        email: "marcos.terapeuta@intea.com.br",
        password: "Senha@123",
      });
      expect(resTerapeuta.data.user?.id).toBe(MOCK_USUARIO_TERAPEUTA.id);

      const resAdmin = await loginMock({
        email: "admin@intea.com.br",
        password: "Admin@123",
      });
      expect(resAdmin.data.user?.is_super_admin).toBe(true);
    });

    it("logoutMock deve encerrar sessão em memória", async () => {
      const res = await logoutMock();
      expect(res.data).toBeNull();
      expect(res.message).toBe("Sessão encerrada com sucesso.");
    });

    it("refreshMock deve gerar novos tokens", async () => {
      const tokens = await refreshMock("mock-refresh-valid");
      expect(tokens.access_token).toContain("mock-jwt-refreshed");
    });

    it("obterUsuarioAtualMock deve retornar usuário válido", async () => {
      const user = await obterUsuarioAtualMock();
      expect(user).toHaveProperty("nome");
      expect(user).toHaveProperty("email");
    });
  });
});
