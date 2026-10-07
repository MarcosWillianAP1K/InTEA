import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Timer, FileText, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export interface ModalFinalizarSessaoProps {
  aberto: boolean;
  tempoDecorrido: string;
  onConfirmar: (anotacoes: string) => Promise<void> | void;
  onCancelar: () => void;
  isSubmitting?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE: ModalFinalizarSessao (Front-end 1 — Hermeson Alves / Card 3.3)
 * Requisitos: RF13, RF17, RN05 (Imutabilidade do Histórico)
 * Confirmação explícita de encerramento e anotação clínica preliminar
 * ============================================================================
 */
export function ModalFinalizarSessao({
  aberto,
  tempoDecorrido,
  onConfirmar,
  onCancelar,
  isSubmitting = false,
}: ModalFinalizarSessaoProps) {
  const [anotacoes, setAnotacoes] = useState("");

  const handleConfirmar = async () => {
    await onConfirmar(anotacoes);
  };

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && !isSubmitting && onCancelar()}>
      <DialogContent
        data-testid="modal-finalizar-sessao"
        className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl"
      >
        <div className="p-6 pb-4">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Finalizar Sessão Clínica
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação encerra a coleta de telemetria ativa no tablet e consolida o prontuário.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-5">
            {/* Card de resumo de tempo */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Timer className="h-4 w-4 text-[#0b3294] dark:text-blue-400" />
                Duração total da intervenção:
              </span>
              <span
                data-testid="tempo-resumo-finalizacao"
                className="text-base font-bold font-mono text-foreground"
              >
                {tempoDecorrido}
              </span>
            </div>

            {/* Campo de Anotações Clínicas Preliminares */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="anotacoes-clinicas"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Anotações Clínicas Preliminares (Opcional):</span>
              </label>
              <textarea
                id="anotacoes-clinicas"
                data-testid="textarea-anotacoes-clinicas"
                rows={4}
                value={anotacoes}
                onChange={(e) => setAnotacoes(e.target.value)}
                placeholder="Ex: Paciente demonstrou boa resposta aos estímulos visuais, porém apresentou leve desatenção aos 15 minutos..."
                className="w-full text-xs rounded-xl border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0b3294] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/40 border-t border-border px-6 py-4 flex flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancelar}
            className="bg-card border-border text-foreground hover:bg-muted text-xs font-semibold px-5 py-2.5 h-auto rounded-xl shadow-2xs"
          >
            Continuar Sessão
          </Button>

          <Button
            type="button"
            data-testid="botao-confirmar-finalizacao"
            variant="destructive"
            disabled={isSubmitting}
            onClick={handleConfirmar}
            className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 h-auto rounded-xl shadow-md cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Finalizando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirmar Encerramento</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
