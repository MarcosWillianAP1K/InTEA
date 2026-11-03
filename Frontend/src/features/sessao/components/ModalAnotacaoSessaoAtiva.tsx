import { useState, useEffect, useCallback, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  NotebookPen,
  FileText,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  UserCheck,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { anotacaoService } from "@/features/anotacao/services/anotacao.service";
import type { AnotacaoClinica } from "@/features/anotacao/types/anotacao.types";

/**
 * ============================================================================
 * COMPONENTE: ModalAnotacaoSessaoAtiva (Cockpit de Sessão em Tempo Real)
 * Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria do Terapeuta),
 *              RN01 (Modo Livre Sem Prontuário), RN04 (Vínculo Clínico / 403),
 *              RN05 (Inalterabilidade do Histórico), RNF05 (Feedback Não-Intrusivo)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface ModalAnotacaoSessaoAtivaProps {
  aberto: boolean;
  onFechar: () => void;
  sessaoId: string;
  pacienteId?: string | null;
  pacienteNome?: string;
  isModoLivre?: boolean;
  onAnotacaoSalva?: (anotacao: AnotacaoClinica) => void;
}

const LIMITE_CARACTERES = 2000;
const MINIMO_CARACTERES = 3;

/**
 * Renders real-time clinical note capture modal during active session without interrupting gameplay.
 * Real-Time Documentation (RF13, RF16, RN01): Links observations directly to session UUID and author JWT.
 *
 * @param props - Modal properties including visibility state, session UUID, and submission handler
 * @returns Clinical observation modal component
 */
export function ModalAnotacaoSessaoAtiva({
  aberto,
  onFechar,
  sessaoId,
  pacienteId,
  pacienteNome = "Paciente em Atendimento",
  isModoLivre = false,
  onAnotacaoSalva,
}: ModalAnotacaoSessaoAtivaProps) {
  const textareaId = useId();
  const draftKey = `draft_anotacao_sessao_${sessaoId}`;

  // Estados locais
  const [conteudo, setConteudo] = useState("");
  const [anotacoes, setAnotacoes] = useState<AnotacaoClinica[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  // 1. Carrega ou restaura rascunho de sessionStorage tolerante a F5 ou fechamento acidental
  useEffect(() => {
    if (!aberto) return;

    try {
      const draftSalvo = typeof window !== "undefined" ? sessionStorage.getItem(draftKey) : null;
      if (draftSalvo) {
        setConteudo(draftSalvo);
      }
    } catch {
      // sessionStorage indisponível em ambientes restritos; segue sem quebrar
    }
  }, [aberto, draftKey]);

  // 2. Busca histórico cronológico de anotações da sessão via anotacaoService
  const carregarHistoricoAnotacoes = useCallback(async () => {
    if (!sessaoId || isModoLivre) {
      setAnotacoes([]);
      return;
    }

    setCarregandoHistorico(true);
    setErroCarregamento(null);

    try {
      const historico = await anotacaoService.listarPorSessao(sessaoId);
      // Garante ordem cronológica
      const ordenado = Array.isArray(historico)
        ? [...historico].sort((a, b) => {
            const dataA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dataB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dataA - dataB;
          })
        : [];
      setAnotacoes(ordenado);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as anotações anteriores desta sessão.";
      setErroCarregamento(msg);
    } finally {
      setCarregandoHistorico(false);
    }
  }, [sessaoId, isModoLivre]);

  useEffect(() => {
    if (aberto) {
      void carregarHistoricoAnotacoes();
    }
  }, [aberto, carregarHistoricoAnotacoes]);

  // 3. Atualização de texto com sincronização contínua do draft em sessionStorage
  const handleAlterarConteudo = (texto: string) => {
    setConteudo(texto);
    if (erroSalvar) setErroSalvar(null);

    try {
      if (typeof window !== "undefined") {
        if (texto.trim().length > 0) {
          sessionStorage.setItem(draftKey, texto);
        } else {
          sessionStorage.removeItem(draftKey);
        }
      }
    } catch {
      // sessionStorage inacessível
    }
  };

  // 4. Submissão assíncrona da nova anotação clínica
  const handleSalvarAnotacao = async () => {
    const textoLimpo = conteudo.trim();

    // Validações de guarda (RN01, tamanho mínimo e concorrência)
    if (isModoLivre || !pacienteId) {
      toast.info("Partidas em Modo Livre não registram anotações no prontuário.");
      return;
    }

    if (textoLimpo.length < MINIMO_CARACTERES) {
      setErroSalvar(`A anotação deve conter no mínimo ${MINIMO_CARACTERES} caracteres.`);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErroSalvar(null);

    try {
      const novaAnotacao = await anotacaoService.criar({
        paciente_id: pacienteId,
        sessao_id: sessaoId,
        conteudo: textoLimpo,
      });

      // Atualiza lista cronológica localmente
      setAnotacoes((prev) => [...prev, novaAnotacao]);

      // Limpa formulário e rascunho persistido
      setConteudo("");
      try {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(draftKey);
        }
      } catch {
        // sessionStorage
      }

      // Feedback sutil e não-intrusivo (RNF05)
      toast.success("Anotação clínica registrada com sucesso no prontuário.");

      if (onAnotacaoSalva) {
        onAnotacaoSalva(novaAnotacao);
      }
    } catch (err: unknown) {
      // Resiliência contra 403 Forbidden (RN04) ou outros erros sem derrubar o Cockpit
      const msgErro =
        err instanceof Error ? err.message : "Erro desconhecido ao registrar anotação.";

      const isForbidden =
        msgErro.includes("403") ||
        msgErro.toLowerCase().includes("forbidden") ||
        msgErro.toLowerCase().includes("vínculo");

      if (isForbidden) {
        const msgFormatada =
          "Acesso negado: terapeuta sem vínculo ativo nesta clínica ou prontuário.";
        setErroSalvar(msgFormatada);
        toast.error(msgFormatada);
      } else {
        setErroSalvar(msgErro);
        toast.error("Erro ao registrar anotação no prontuário. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tamanhoTexto = conteudo.trim().length;
  const textoInvalido = tamanhoTexto > 0 && tamanhoTexto < MINIMO_CARACTERES;
  const podeSalvar =
    !isModoLivre &&
    Boolean(pacienteId) &&
    tamanhoTexto >= MINIMO_CARACTERES &&
    !isSubmitting;

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && !isSubmitting && onFechar()}>
      <DialogContent
        data-testid="modal-anotacao-sessao-ativa"
        className="sm:max-w-xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 pb-4 border-b border-border/60">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-primary">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <NotebookPen className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                    Anotações Clínicas em Tempo Real
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Sessão Ativa: <span className="font-mono text-foreground">{sessaoId}</span>
                  </DialogDescription>
                </div>
              </div>

              {isModoLivre ? (
                <Badge
                  data-testid="badge-modo-livre-modal"
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300"
                >
                  Modo Livre
                </Badge>
              ) : (
                <Badge
                  data-testid="badge-paciente-modal"
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 max-w-44 truncate"
                >
                  {pacienteNome}
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        {/* Corpo do Modal com Scroll Interno */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Alerta de Modo Livre (RN01) */}
          {isModoLivre && (
            <div
              data-testid="alerta-modo-livre-modal"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs"
            >
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                <strong>Aviso:</strong> Partidas em Modo Livre não
                registram anotações no prontuário clínico.
              </span>
            </div>
          )}

          {/* Histórico Cronológico de Anotações Anteriores */}
          <section
            aria-label="Histórico de Anotações da Sessão"
            className="flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Histórico da Sessão Ativa ({anotacoes.length})</span>
              </span>

              {!isModoLivre && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="botao-recarregar-anotacoes"
                  onClick={() => void carregarHistoricoAnotacoes()}
                  disabled={carregandoHistorico}
                  className="h-7 px-2 text-2xs text-muted-foreground hover:text-foreground"
                  title="Atualizar histórico"
                >
                  <RotateCcw
                    className={`h-3 w-3 mr-1 ${carregandoHistorico ? "animate-spin" : ""}`}
                  />
                  <span>Atualizar</span>
                </Button>
              )}
            </div>

            {/* Estado de Carregamento */}
            {carregandoHistorico && (
              <div
                data-testid="carregando-anotacoes"
                className="flex items-center justify-center gap-2 p-6 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Carregando anotações anteriores da sessão...</span>
              </div>
            )}

            {/* Estado de Erro no Carregamento */}
            {!carregandoHistorico && erroCarregamento && (
              <div
                data-testid="erro-carregamento-anotacoes"
                className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{erroCarregamento}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void carregarHistoricoAnotacoes()}
                  className="h-7 text-xs bg-card"
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Estado Vazio */}
            {!carregandoHistorico && !erroCarregamento && anotacoes.length === 0 && (
              <div
                data-testid="lista-anotacoes-vazia"
                className="p-5 text-center rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground"
              >
                <FileText className="h-6 w-6 mx-auto mb-1.5 opacity-40 text-muted-foreground" />
                <p>Nenhuma anotação registrada ainda nesta sessão.</p>
                <p className="text-2xs text-muted-foreground/80 mt-0.5">
                  As anotações digitadas abaixo aparecerão neste histórico cronológico.
                </p>
              </div>
            )}

            {/* Lista Cronológica */}
            {!carregandoHistorico && !erroCarregamento && anotacoes.length > 0 && (
              <div
                data-testid="lista-anotacoes-sessao"
                className="max-h-48 overflow-y-auto space-y-2 pr-1"
              >
                {anotacoes.map((item) => {
                  const autorNome =
                    item.terapeuta_nome || item.autor?.nome || "Terapeuta Responsável";
                  const dataFormatada = item.created_at
                    ? new Date(item.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Horário não informado";

                  return (
                    <div
                      key={item.id}
                      data-testid={`item-anotacao-${item.id}`}
                      className="p-3 rounded-xl bg-muted/40 border border-border/70 text-xs flex flex-col gap-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between text-2xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-primary" />
                          <span>{autorNome}</span>
                        </span>
                        <span className="font-mono">{dataFormatada}</span>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {item.conteudo}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Seção de Redação de Nova Anotação */}
          <section
            aria-label="Registrar Nova Anotação"
            className="flex flex-col gap-2 pt-2 border-t border-border/60"
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor={textareaId}
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Nova Observação Clínica:</span>
              </label>
              <span
                data-testid="contador-caracteres-modal"
                className={`text-2xs ${
                  conteudo.length > LIMITE_CARACTERES * 0.9
                    ? "text-amber-600 font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {conteudo.length} / {LIMITE_CARACTERES} caracteres
              </span>
            </div>

            <textarea
              id={textareaId}
              data-testid="textarea-anotacao-sessao"
              rows={3}
              maxLength={LIMITE_CARACTERES}
              disabled={isModoLivre || isSubmitting}
              value={conteudo}
              onChange={(e) => handleAlterarConteudo(e.target.value)}
              placeholder={
                isModoLivre
                  ? "Modo Livre: anotações no prontuário indisponíveis."
                  : "Registre aqui a reação imediata do paciente, desatenção, regulação sensorial ou condutas em tempo real..."
              }
              className="w-full text-xs rounded-xl border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none disabled:opacity-50 disabled:bg-muted/30"
            />

            {/* Aviso de validação de tamanho mínimo */}
            {textoInvalido && (
              <p
                data-testid="aviso-validacao-tamanho"
                className="text-2xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                <span>A anotação deve conter no mínimo {MINIMO_CARACTERES} caracteres.</span>
              </p>
            )}

            {/* Mensagem de Erro na Submissão */}
            {erroSalvar && (
              <div
                data-testid="erro-salvar-anotacao"
                className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-2xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{erroSalvar}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSalvarAnotacao()}
                  className="h-6 px-2 text-2xs bg-card"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="bg-muted/30 border-t border-border px-6 py-3.5 flex flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onFechar}
            className="text-xs font-semibold px-4 py-2 min-h-11 rounded-xl"
          >
            Fechar
          </Button>

          <Button
            type="button"
            data-testid="botao-salvar-anotacao-modal"
            variant="default"
            disabled={!podeSalvar}
            onClick={() => void handleSalvarAnotacao()}
            className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer min-h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Registrar Anotação</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ModalAnotacaoSessaoAtiva;