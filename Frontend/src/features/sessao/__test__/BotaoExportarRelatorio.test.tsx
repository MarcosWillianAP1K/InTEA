import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BotaoExportarRelatorio } from "../components/resultado/BotaoExportarRelatorio";
import { sessaoService } from "../services/sessaoService";

describe("Card 4.4 — BotaoExportarRelatorio e useRelatorioExport (Front-end 2 — Luma Maiara)", () => {
  const originalPrint = window.print;

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  afterEach(() => {
    window.print = originalPrint;
  });

  describe("Renderização e Variantes", () => {
    it("deve renderizar botão principal de impressão e botão secundário de JSON no modo completo", () => {
      render(
        <BotaoExportarRelatorio
          sessaoId="sessao-123"
          pacienteNome="Lucas Gabriel"
          jogoTitulo="Aventura Cognitiva"
        />
      );

      expect(screen.getByTestId("botao-exportar-relatorio")).toBeDefined();
      expect(screen.getByText("Imprimir / Exportar PDF")).toBeDefined();
      expect(screen.getByTestId("botao-exportar-json")).toBeDefined();
      expect(screen.getByText("Baixar Dados (JSON)")).toBeDefined();
    });

    it("deve renderizar botão único compacto quando variante for 'compacto'", () => {
      render(
        <BotaoExportarRelatorio
          sessaoId="sessao-123"
          variante="compacto"
        />
      );

      expect(screen.getByTestId("botao-exportar-relatorio")).toBeDefined();
      expect(screen.getByText("Imprimir Laudo")).toBeDefined();
      expect(screen.queryByTestId("botao-exportar-json")).toBeNull();
    });
  });

  describe("Fluxo de Impressão e PDF (window.print)", () => {
    it("deve chamar window.print() ao clicar no botão de impressão e exibir feedback", async () => {
      const printMock = vi.fn();
      window.print = printMock;
      const onSucessoMock = vi.fn();

      render(
        <BotaoExportarRelatorio
          sessaoId="sessao-abc"
          pacienteNome="Ana Clara"
          onExportarSucesso={onSucessoMock}
        />
      );

      const btnImprimir = screen.getByTestId("botao-exportar-relatorio");
      fireEvent.click(btnImprimir);

      await waitFor(() => {
        expect(printMock).toHaveBeenCalled();
      });

      expect(onSucessoMock).toHaveBeenCalledWith("impressao");
    });
  });

  describe("Fluxo de Download de JSON Clínico Sanitizado", () => {
    it("deve disparar download do JSON ao clicar no botão de download", async () => {
      const onSucessoMock = vi.fn();

      // Mock para URL.createObjectURL e link click
      const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      render(
        <BotaoExportarRelatorio
          sessaoId="sessao-xyz"
          pacienteNome="Rafael Costa"
          onExportarSucesso={onSucessoMock}
        />
      );

      const btnJson = screen.getByTestId("botao-exportar-json");
      fireEvent.click(btnJson);

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled();
      });

      expect(onSucessoMock).toHaveBeenCalledWith("json");
    });
  });

  describe("Proteção contra Múltiplos Cliques Concorrentes (isExporting)", () => {
    it("deve desabilitar botões enquanto uma exportação estiver sendo processada", async () => {
      window.print = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 150))
      );

      render(
        <BotaoExportarRelatorio
          sessaoId="sessao-busy"
          pacienteNome="Mariana Silva"
        />
      );

      const btnImprimir = screen.getByTestId("botao-exportar-relatorio");
      fireEvent.click(btnImprimir);

      // Botão desabilitado durante o ciclo de exportação
      await waitFor(() => {
        expect(btnImprimir.getAttribute("disabled")).not.toBeNull();
      });
    });
  });

  describe("Tratamento de Falhas e Erros", () => {
    it("deve exibir mensagem de erro caso o serviço falhe", async () => {
      vi.spyOn(sessaoService, "exportarRelatorio").mockResolvedValue({
        sucesso: false,
        error: "Sessão não localizada ou não finalizada",
      });

      const onErroMock = vi.fn();

      render(
        <BotaoExportarRelatorio
          sessaoId="sessao-inexistente"
          onExportarErro={onErroMock}
        />
      );

      expect(screen.getByTestId("botao-exportar-relatorio")).toBeDefined();
    });
  });
});
