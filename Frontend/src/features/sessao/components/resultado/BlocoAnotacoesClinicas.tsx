import { useState, useId } from "react";
import { sessaoService } from "../../services/sessaoService";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { Button } from "@/shared/components/ui/button";
import {
  FileText,
  UserCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";

export interface BlocoAnotacoesClinicasProps {
  sessaoId?: string;
  pacienteId?: string;
  anotacaoId?: string;
  anotacaoInicial?: string;
  anotacoesSessao?: Array<{
    id: string;
    conteudo: string;
    created_at?: string;
    terapeuta_nome?: string;
    registro_profissional?: string;
    autor?: {
      nome?: string;
      registro_profissional?: string | null;
      crefito?: string | null;
    } | null;
  }>;
  terapeutaNome?: string;
  terapeutaRegistro?: string;
  onSalvar?: (conteudo: string) => Promise<boolean | void> | boolean | void;
  readOnly?: boolean;
}

/**
 * ============================================================================
 * COMPONENT: BlocoAnotacoesClinicas (Clinical Notes)
 * Compliance: RF16 (Notes Block), RF21 (Mandatory Authorship), RN05 (Medical Record Immutability)
 * ============================================================================
 */
/**
 * Renders clinical notes section in session outcome review page with quick note creation.
 * Post-Session Documentation (RF16, RF21): Displays notes captured during session and allows final remarks.
 *
 * @param props - Component properties including session ID, patient ID, and note list
 * @returns Post-session clinical notes block component
 */
export function BlocoAnotacoesClinicas({
  sessaoId,
  pacienteId,
  anotacaoId: anotacaoIdProp,
  anotacaoInicial = "",
  anotacoesSessao = [],
  terapeutaNome: terapeutaNomeProp,
  terapeutaRegistro: terapeutaRegistroProp,
  onSalvar,
  readOnly = false,
}: BlocoAnotacoesClinicasProps) {
  const user = useAuthStore((state) => state.user);
  const terapeutaNome =
    terapeutaNomeProp || user?.nome || "Terapeuta Responsável";
  const terapeutaRegistro =
    terapeutaRegistroProp ||
    user?.registro_profissional ||
    user?.crefito ||
    "Registro Profissional";

  const [conteudo, setConteudo] = useState(anotacaoInicial);
  const [anotacaoId, setAnotacaoId] = useState<string | undefined>(anotacaoIdProp);
  const [statusSalvar, setStatusSalvar] = useState<
    "ocioso" | "salvando" | "salvo" | "erro"
  >("ocioso");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);

  const textareaId = useId();
  const limiteCaracteres = 2000;
  const isSubmitting = statusSalvar === "salvando";

  const handleSalvar = async () => {
    if (isSubmitting || readOnly || !conteudo.trim()) return;

    setStatusSalvar("salvando");
    setMensagemErro(null);

    try {
      if (onSalvar) {
        await onSalvar(conteudo.trim());
      } else {
        const resposta = await sessaoService.salvarAnotacao({
          sessaoId,
          pacienteId,
          anotacaoId,
          conteudo: conteudo.trim(),
        });

        if (!resposta.sucesso) {
          throw new Error(resposta.error || "Erro ao salvar anotação");
        }

        if (resposta.data?.id) {
          setAnotacaoId(resposta.data.id);
        }
      }

      setStatusSalvar("salvo");
      setUltimaAtualizacao(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Falha ao registrar anotação no prontuário";
      setStatusSalvar("erro");
      setMensagemErro(msg);
    }
  };

  return (
    <section
      data-testid="bloco-anotacoes-clinicas"
      aria-labelledby="titulo-bloco-anotacoes"
      className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 text-card-foreground"
    >
      {/* Cabeçalho do Bloco e Autoria Indelével (RF21) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3
              id="titulo-bloco-anotacoes"
              className="text-base font-bold text-foreground tracking-tight"
            >
              Anotações Clínicas & Parecer do Terapeuta
            </h3>
            <p className="text-xs text-muted-foreground">
              Observações qualitativas consolidadas no prontuário do paciente
            </p>
          </div>
        </div>

        {/* Identificação de Autoria do Terapeuta (RF21) */}
        <div
          data-testid="terapeuta-autor-info"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground"
        >
          <UserCheck className="h-4 w-4 text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold leading-tight">{terapeutaNome}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {terapeutaRegistro}
            </span>
          </div>
        </div>
      </div>



      {/* Histórico de Notas Tomadas Durante a Sessão (Cockpit em Tempo Real - RF16) */}
      {anotacoesSessao.length > 0 && (
        <div
          data-testid="historico-anotacoes-sessao"
          className="flex flex-col gap-2.5 p-4 rounded-xl bg-muted/30 border border-border/70"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              Observações Registradas Durante a Intervenção ({anotacoesSessao.length})
            </span>
            <span className="text-2xs text-muted-foreground font-mono">Cockpit / Tempo Real</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {anotacoesSessao.map((anot, idx) => (
              <div
                key={anot.id || idx}
                className="p-3 rounded-lg bg-card border border-border/50 text-xs flex flex-col gap-1 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {anot.autor?.nome || anot.terapeuta_nome || "Terapeuta"}
                  </span>
                  <span>
                    {anot.created_at
                      ? new Date(anot.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {anot.conteudo}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campo de Texto Principal */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textareaId}
          className="text-xs font-medium text-foreground flex items-center justify-between"
        >
          <span>Parecer Técnico e Recomendações Terapêuticas:</span>
          <span
            data-testid="contador-caracteres"
            className="text-[11px] text-muted-foreground"
          >
            {conteudo.length} / {limiteCaracteres} caracteres
          </span>
        </label>
        <textarea
          id={textareaId}
          data-testid="textarea-anotacoes-clinicas"
          rows={5}
          maxLength={limiteCaracteres}
          disabled={readOnly || isSubmitting}
          value={conteudo}
          onChange={(e) => {
            setConteudo(e.target.value);
            if (statusSalvar !== "ocioso") {
              setStatusSalvar("ocioso");
            }
          }}
          placeholder="Registre aqui a evolução clínica, respostas a intervenções DDA, regulação sensorial, foco de atenção e condutas recomendadas..."
          className="w-full text-xs rounded-xl border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y disabled:opacity-60"
        />
      </div>

      {/* Rodapé de Ações e Feedback Visual de Persistência */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Status de Persistência */}
        <div className="flex items-center gap-2 text-xs min-h-6">
          {statusSalvar === "salvando" && (
            <span
              data-testid="status-salvando"
              className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Salvando anotações no prontuário...</span>
            </span>
          )}

          {statusSalvar === "salvo" && (
            <span
              data-testid="status-salvo"
              className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                Salvo com sucesso
                {ultimaAtualizacao && ` às ${ultimaAtualizacao}`}
              </span>
            </span>
          )}

          {statusSalvar === "erro" && (
            <span
              data-testid="status-erro"
              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{mensagemErro || "Falha ao salvar anotação"}</span>
            </span>
          )}

          {statusSalvar === "ocioso" && ultimaAtualizacao && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Última sincronização: {ultimaAtualizacao}</span>
            </span>
          )}
        </div>

        {/* Botão com Proteção contra Duplo Clique (isSubmitting) */}
        {!readOnly && (
          <Button
            type="button"
            data-testid="botao-salvar-anotacao"
            disabled={isSubmitting || !conteudo.trim()}
            onClick={handleSalvar}
            className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 h-auto rounded-xl shadow-xs cursor-pointer self-end sm:self-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Salvar Anotação</span>
              </>
            )}
          </Button>
        )}
      </div>
    </section>
  );
}
