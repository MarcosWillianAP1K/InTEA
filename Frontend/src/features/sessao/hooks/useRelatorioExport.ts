import * as React from "react";
import { sessaoService } from "../services/sessao.service";

export interface UseRelatorioExportOptions {
  sessaoId?: string;
  tituloPadrao?: string;
  onSucesso?: (tipo: "impressao" | "json") => void;
  onErro?: (erro: string) => void;
}

export interface UseRelatorioExportReturn {
  isExporting: boolean;
  erroExportacao: string | null;
  dadosExportados: unknown | null;
  imprimirRelatorio: (tituloCustomizado?: string) => Promise<boolean>;
  exportarJson: (dadosParaExportar?: unknown, nomeArquivoCustomizado?: string) => Promise<boolean>;
  carregarDadosExportacao: (id?: string) => Promise<unknown | null>;
  limparErro: () => void;
}

// ============================================================================
// HOOK: useRelatorioExport (Front-end 2 — Luma Maiara / Card 4.4)
// ============================================================================

/**
 * React hook managing clinical report export and PDF printing lifecycle.
 * Handles formatted browser printing with A4 layout, downloads sanitized clinical JSON reports,
 * protects against concurrent exports, and fetches structured report payloads from the backend.
 *
 * @param options - Optional session ID, default document title, and success/error callbacks.
 * @returns Export state flags, fetched report payload, and print/download actions.
 */
export function useRelatorioExport(
  options: UseRelatorioExportOptions = {}
): UseRelatorioExportReturn {
  const { sessaoId, tituloPadrao = "Relatorio_Clinico_InTEA", onSucesso, onErro } = options;

  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [erroExportacao, setErroExportacao] = React.useState<string | null>(null);
  const [dadosExportados, setDadosExportados] = React.useState<unknown | null>(null);

  const limparErro = React.useCallback(() => {
    setErroExportacao(null);
  }, []);

  /**
   * Triggers browser printing of the clinical report via `window.print()`,
   * temporarily updating the document title so the exported PDF receives a descriptive filename.
   *
   * @param tituloCustomizado - Optional custom title override for the printed document.
   * @returns `true` if printing was triggered successfully, `false` otherwise.
   */
  const imprimirRelatorio = React.useCallback(
    async (tituloCustomizado?: string): Promise<boolean> => {
      if (isExporting) return false;

      setIsExporting(true);
      limparErro();

      try {
        const tituloAntigo = typeof document !== "undefined" ? document.title : "";
        const novoTitulo =
          tituloCustomizado ||
          (sessaoId ? `${tituloPadrao}_${sessaoId}` : tituloPadrao);

        if (typeof document !== "undefined") {
          document.title = novoTitulo;
        }

        // Aguarda ciclo de microtask para aplicação dos estilos antes de abrir o print dialog
        await new Promise((resolve) => setTimeout(resolve, 50));

        if (typeof window !== "undefined" && typeof window.print === "function") {
          window.print();
        }

        if (typeof document !== "undefined") {
          document.title = tituloAntigo;
        }

        onSucesso?.("impressao");
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Falha ao acionar a impressão do relatório";
        setErroExportacao(msg);
        onErro?.(msg);
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, sessaoId, tituloPadrao, limparErro, onSucesso, onErro]
  );

  /**
   * Triggers JSON download of sanitized structured clinical report.
   */
  const exportarJson = React.useCallback(
    async (dadosParaExportar?: unknown, nomeArquivoCustomizado?: string): Promise<boolean> => {
      if (isExporting) return false;

      setIsExporting(true);
      limparErro();

      try {
        const dadosFinais = dadosParaExportar ?? dadosExportados ?? {
          sessaoId,
          dataExportacao: new Date().toISOString(),
          sistema: "InTEA",
        };

        const jsonString = JSON.stringify(dadosFinais, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const nomeArquivo =
          nomeArquivoCustomizado ||
          (sessaoId ? `laudo_clinico_${sessaoId}.json` : "laudo_clinico_intea.json");

        if (typeof document !== "undefined") {
          const link = document.createElement("a");
          link.href = url;
          link.download = nomeArquivo;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        onSucesso?.("json");
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Falha ao gerar o arquivo de exportação JSON";
        setErroExportacao(msg);
        onErro?.(msg);
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, dadosExportados, sessaoId, limparErro, onSucesso, onErro]
  );

  /**
   * Queries structured clinical report export data for the session from the backend.
   *
   * @param id - Optional session UUID override; defaults to `options.sessaoId`.
   * @returns Exported report data object, or `null` if an error occurred.
   */
  const carregarDadosExportacao = React.useCallback(
    async (id?: string): Promise<unknown | null> => {
      const idSessaoConsulta = id || sessaoId;
      if (!idSessaoConsulta) {
        const msg = "ID da sessão não informado para exportação";
        setErroExportacao(msg);
        onErro?.(msg);
        return null;
      }

      setIsExporting(true);
      limparErro();

      try {
        const resposta = await sessaoService.exportarRelatorio(idSessaoConsulta);
        if (!resposta.sucesso) {
          const msg = resposta.error || "Erro ao carregar dados do relatório para exportação";
          setErroExportacao(msg);
          onErro?.(msg);
          return null;
        }

        setDadosExportados(resposta.data);
        return resposta.data;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erro inesperado ao consultar exportação clínica";
        setErroExportacao(msg);
        onErro?.(msg);
        return null;
      } finally {
        setIsExporting(false);
      }
    },
    [sessaoId, limparErro, onErro]
  );

  return {
    isExporting,
    erroExportacao,
    dadosExportados,
    imprimirRelatorio,
    exportarJson,
    carregarDadosExportacao,
    limparErro,
  };
}
