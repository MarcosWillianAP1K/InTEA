import * as React from "react";
import { Button } from "@/shared/components/ui/button";
import { useRelatorioExport } from "../../hooks/useRelatorioExport";
import {
  Printer,
  FileDown,
  Loader2,
  FileCheck,
  AlertCircle,
} from "lucide-react";

export interface BotaoExportarRelatorioProps {
  sessaoId?: string;
  pacienteNome?: string;
  jogoTitulo?: string;
  dadosLaudo?: unknown;
  variante?: "completo" | "compacto";
  onExportarSucesso?: (tipo: "impressao" | "json") => void;
  onExportarErro?: (erro: string) => void;
  className?: string;
}



export function BotaoExportarRelatorio({
  sessaoId,
  pacienteNome,
  jogoTitulo,
  dadosLaudo,
  variante = "completo",
  onExportarSucesso,
  onExportarErro,
  className = "",
}: BotaoExportarRelatorioProps) {
  const [feedbackSucesso, setFeedbackSucesso] = React.useState<string | null>(null);

  const { isExporting, erroExportacao, imprimirRelatorio, exportarJson, limparErro } =
    useRelatorioExport({
      sessaoId,
      tituloPadrao: pacienteNome
        ? `Laudo_InTEA_${pacienteNome.replace(/\s+/g, "_")}`
        : "Laudo_Clinico_InTEA",
      onSucesso: (tipo) => {
        setFeedbackSucesso(tipo === "impressao" ? "Preparando impressão..." : "Download concluído!");
        setTimeout(() => setFeedbackSucesso(null), 3500);
        onExportarSucesso?.(tipo);
      },
      onErro: (erro) => {
        setFeedbackSucesso(null);
        onExportarErro?.(erro);
      },
    });

  const handleImprimir = async () => {
    limparErro();
    await imprimirRelatorio();
  };

  const handleDownloadJson = async () => {
    limparErro();
    const payload = dadosLaudo ?? {
      sessaoId,
      paciente: pacienteNome ?? "Não informado",
      jogo: jogoTitulo ?? "Jogo Terapêutico",
      dataEmissao: new Date().toISOString(),
      sistema: "InTEA",
    };
    await exportarJson(
      payload,
      sessaoId ? `laudo_clinico_${sessaoId}.json` : "laudo_clinico_intea.json"
    );
  };

  if (variante === "compacto") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Button
          data-testid="botao-exportar-relatorio"
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={handleImprimir}
          className="rounded-xl font-medium flex items-center gap-2 border-border shadow-2xs hover:bg-accent cursor-pointer"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Printer className="h-4 w-4 text-[#0b3294] dark:text-blue-400" />
          )}
          <span>{isExporting ? "Gerando..." : "Imprimir Laudo"}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Botão Principal: Impressão Formatada / PDF */}
      <Button
        data-testid="botao-exportar-relatorio"
        variant="default"
        disabled={isExporting}
        onClick={handleImprimir}
        className="rounded-xl bg-[#0b3294] hover:bg-[#092875] text-white font-medium flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        <span>{isExporting ? "Processando laudo..." : "Imprimir / Exportar PDF"}</span>
      </Button>

      {/* Botão Secundário: Download dos Dados Sanitizados em JSON */}
      <Button
        data-testid="botao-exportar-json"
        variant="outline"
        disabled={isExporting}
        onClick={handleDownloadJson}
        className="rounded-xl font-medium flex items-center justify-center gap-2 border-border hover:bg-accent text-foreground cursor-pointer"
      >
        <FileDown className="h-4 w-4 text-muted-foreground" />
        <span>Baixar Dados (JSON)</span>
      </Button>

      {/* Feedback de Sucesso */}
      {feedbackSucesso && (
        <span
          data-testid="feedback-exportar-sucesso"
          className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in-50 duration-200"
        >
          <FileCheck className="h-3.5 w-3.5" />
          {feedbackSucesso}
        </span>
      )}

      {/* Feedback de Erro */}
      {erroExportacao && (
        <span
          data-testid="feedback-exportar-erro"
          className="text-2xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-in fade-in-50 duration-200"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {erroExportacao}
        </span>
      )}
    </div>
  );
}
