import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "../services/auth.service";
import { http } from "@/core/api";

describe("Fluxo de Recuperação e Redefinição de Senha (RF01, RNF03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authService.solicitarRecuperacaoSenha", () => {
    it("deve solicitar recuperação de senha com sucesso via API (200 OK anti-enumeração)", async () => {
      const mockResposta = {
        data: {
          recuperacao: {
            email: "terapeuta@intea.com.br",
            solicitado: true,
          },
        },
        message:
          "Se o e-mail informado estiver cadastrado, as instruções para redefinição de senha foram enviadas.",
      };

      vi.spyOn(http, "post").mockResolvedValueOnce(mockResposta);

      const res = await authService.solicitarRecuperacaoSenha(
        "terapeuta@intea.com.br",
      );

      expect(http.post).toHaveBeenCalledWith("/auth/recuperar-senha", {
        email: "terapeuta@intea.com.br",
      });
      expect(res.data.recuperacao.solicitado).toBe(true);
      expect(res.message).toContain("instruções");
    });

    it("deve recorrer ao fallback bdmock caso a requisição HTTP falhe", async () => {
      vi.spyOn(http, "post").mockRejectedValueOnce(new Error("Falha de rede"));

      const res = await authService.solicitarRecuperacaoSenha(
        "terapeuta@intea.com.br",
      );

      expect(res.data.recuperacao.solicitado).toBe(true);
      expect(res.data.recuperacao.email).toBe("terapeuta@intea.com.br");
      expect(res.message).toBeDefined();
    });
  });

  describe("authService.redefinirSenha", () => {
    it("deve enviar o token efêmero e a nova senha via API com sucesso", async () => {
      const mockResposta = {
        data: null,
        message: "Senha de acesso redefinida com sucesso.",
      };

      vi.spyOn(http, "post").mockResolvedValueOnce(mockResposta);

      const payload = {
        token: "token-efemero-12345",
        novaSenha: "NovaSenha@123",
      };

      const res = await authService.redefinirSenha(payload);

      expect(http.post).toHaveBeenCalledWith(
        "/auth/redefinir-senha",
        payload,
      );
      expect(res.data).toBeNull();
      expect(res.message).toContain("redefinida com sucesso");
    });

    it("deve validar erro no fallback bdmock se token ou senha forem inválidos", async () => {
      vi.spyOn(http, "post").mockRejectedValueOnce(new Error("Falha de rede"));

      await expect(
        authService.redefinirSenha({
          token: "",
          novaSenha: "123",
        }),
      ).rejects.toThrow("token de recuperação é obrigatório");
    });
  });
});
