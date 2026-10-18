import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configuracoesService, settingsService } from "../services/configuracoes.service";
import {
  MOCK_CONFIGURACOES_PADRAO,
  obterConfiguracoesMock,
  atualizarConfiguracoesMock,
  resetarConfiguracoesMock,
} from "../types/bdmock";
import { http } from "@/core/api/http-client";
import { ENDPOINTS } from "@/core/api/endpoints";

describe("Domínio Settings — settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Modo API (Requisições HTTP bem-sucedidas)", () => {
    it("deve buscar configurações via ENDPOINTS.SETTINGS.BASE", async () => {
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_CONFIGURACOES_PADRAO });

      const resultado = await settingsService.obter();

      expect(getSpy).toHaveBeenCalledWith(ENDPOINTS.SETTINGS.BASE);
      expect(resultado).toEqual(MOCK_CONFIGURACOES_PADRAO);
    });

    it("deve buscar configurações de usuário específico", async () => {
      const usuarioId = "u1111111-1111-4111-8111-111111111111";
      const getSpy = vi
        .spyOn(http, "get")
        .mockResolvedValue({ data: MOCK_CONFIGURACOES_PADRAO });

      const resultado = await settingsService.obter(usuarioId);

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.SETTINGS.USUARIO(usuarioId),
      );
      expect(resultado).toEqual(MOCK_CONFIGURACOES_PADRAO);
    });

    it("deve atualizar configurações via ENDPOINTS.SETTINGS.USUARIO", async () => {
      const usuarioId = "u1111111-1111-4111-8111-111111111111";
      const dto = {
        settings: { theme: "dark" as const },
      };
      const configuracaoAtualizada = {
        ...MOCK_CONFIGURACOES_PADRAO,
        settings: { ...MOCK_CONFIGURACOES_PADRAO.settings, theme: "dark" as const },
      };

      const putSpy = vi
        .spyOn(http, "put")
        .mockResolvedValue({ data: configuracaoAtualizada });

      const resultado = await settingsService.atualizar(usuarioId, dto);

      expect(putSpy).toHaveBeenCalledWith(
        ENDPOINTS.SETTINGS.USUARIO(usuarioId),
        dto,
      );
      expect(resultado.settings.theme).toBe("dark");
    });
  });

  describe("Modo Fallback Resiliente (bdmock.ts)", () => {
    it("deve retornar configurações padrão no fallback quando a API falhar", async () => {
      vi.spyOn(http, "get").mockRejectedValue(new Error("Conexão indisponível"));

      const resultado = await settingsService.obter();

      expect(resultado.settings.language).toBe("pt");
      expect(resultado.notificacoes.alertasEstresseSonoro).toBe(true);
    });

    it("deve atualizar configurações via mock quando a API falhar", async () => {
      vi.spyOn(http, "put").mockRejectedValue(new Error("Falha HTTP"));

      const resultado = await settingsService.atualizar("terapeuta-id", {
        settings: { theme: "light" },
      });

      expect(resultado.settings.theme).toBe("light");
    });

    it("deve restaurar configurações padrão via mock", async () => {
      vi.spyOn(http, "post").mockRejectedValue(new Error("Falha HTTP"));

      const resultado = await settingsService.resetar("terapeuta-id");

      expect(resultado.settings.theme).toBe("Sistema");
      expect(resultado.settings.autoDelete).toBe("Nunca");
    });
  });

  describe("Helpers Diretos de bdmock.ts", () => {
    it("obterConfiguracoesMock deve retornar objeto consistente", async () => {
      const cfg = await obterConfiguracoesMock();
      expect(cfg.settings).toBeDefined();
      expect(cfg.notificacoes).toBeDefined();
      expect(cfg.acessibilidade).toBeDefined();
    });

    it("atualizarConfiguracoesMock deve mesclar preferências", async () => {
      const cfg = await atualizarConfiguracoesMock("usr-1", {
        notificacoes: { notificacoesEmail: false },
      });
      expect(cfg.notificacoes.notificacoesEmail).toBe(false);
      expect(cfg.notificacoes.alertasEstresseSonoro).toBe(true);
    });

    it("resetarConfiguracoesMock deve voltar aos padrões", async () => {
      const cfg = await resetarConfiguracoesMock("usr-1");
      expect(cfg.settings.theme).toBe("Sistema");
    });
  });
});
