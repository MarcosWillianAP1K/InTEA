import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useSessionStore } from "../store/sessionStore";
import { useSessionSync } from "../hooks/useSessionSync";
import { toast } from "sonner";
import {
  Brain,
  Cast,
  VolumeX,
  Sun,
  TimerOff,
  Loader2,
  CheckCircle2,
  Play,
  Copy,
  Check,
} from "lucide-react";

/**
 * ============================================================================
 * MODAL DE PRÉ-SESSÃO E PAREAMENTO REMOTO (InTEA — Sprint 8)
 * Requisitos: RF09 (Catálogo de Jogos), RF10 (Pareamento Remoto), RF12 (Ciclo)
 * Padrão: Shadcn / Radix UI fiel ao design system clínico
 * ============================================================================
 */

/**
 * Modal de configuração preliminar de sessão e pareamento remoto com o tablet (RF09, RF10).
 * Permite selecionar paciente, configurar gatilhos sensoriais a evitar, estresse inicial DDA
 * e exibir o código PIN de pareamento gerado pelo backend.
 */
export function ModalPreSessao() {
  // Sincronização em tempo real entre WebSocket e store global
  useSessionSync();

  const isModalAberto = useSessionStore((state) => state.isModalAberto);
  const status = useSessionStore((state) => state.status);
  const config = useSessionStore((state) => state.config);
  const pareamento = useSessionStore((state) => state.pareamento);
  const erro = useSessionStore((state) => state.erro);

  const fecharModal = useSessionStore((state) => state.fecharModal);
  const configurarParametros = useSessionStore((state) => state.configurarParametros);
  const iniciarPareamento = useSessionStore((state) => state.iniciarPareamento);
  const iniciarIntervencao = useSessionStore((state) => state.iniciarIntervencao);
  const cancelarSessao = useSessionStore((state) => state.cancelarSessao);

  const [copiado, setCopiado] = useState(false);

  /** Formata PIN de pareamento no padrão legível com separador central (ex: 849 - 291) */
  function gerarPINVisual(): string {
    const p1 = Math.floor(100 + Math.random() * 900);
    const p2 = Math.floor(100 + Math.random() * 900);
    return `${p1} - ${p2}`;
  }

  const pinExibido = pareamento?.sessionToken || "849 - 291";

  const nivelEstresse = config?.nivelEstresseInicial ?? 1;
  const gatilhosAtivos = config?.gatilhosEvitar ?? ["Som Alto", "Luz Intensa"];

  /** Alterna inclusão/remoção de gatilho sensorial nos parâmetros da sessão ativa */
  function handleToggleGatilho(gatilho: string) {
    const novos = gatilhosAtivos.includes(gatilho)
      ? gatilhosAtivos.filter((g) => g !== gatilho)
      : [...gatilhosAtivos, gatilho];

    configurarParametros({ gatilhosEvitar: novos });
  }

  /** Atualiza o nível inicial de estresse DDA (1 a 5) antes do início do jogo */
  function handleNivelEstresseChange(novoNivel: number) {
    configurarParametros({ nivelEstresseInicial: novoNivel });
  }

  /** Copia o PIN de pareamento da sessão para a área de transferência com feedback sonner */
  async function handleCopiarPIN() {
    if (!pinExibido) return;

    try {
      await navigator.clipboard.writeText(pinExibido);
      setCopiado(true);
      toast.success("Código de pareamento copiado!");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }

  /** Dispara a intervenção clínica após handshake confirmado do dispositivo remoto (RF12) */
  function handleIniciarJogo() {
    iniciarIntervencao();
    toast.success(
      `Intervenção clínica iniciada com "${config?.jogoTitulo || "Jogo"}"!`,
    );
  }

  /** Cancela o fluxo pré-sessão e libera recursos associados */
  function handleCancelar() {
    cancelarSessao("Sessão cancelada pelo terapeuta");
    toast.info("Configuração de sessão cancelada.");
  }

  if (!config) return null;

  const isPareado = status === "pareado" || status === "em_andamento";

  return (
    <Dialog open={isModalAberto} onOpenChange={(open) => !open && fecharModal()}>
      <DialogContent
        data-testid="modal-pre-sessao"
        className="sm:max-w-[580px] p-0 gap-0 overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="p-7 pb-5">
          <DialogHeader className="gap-1.5 text-left sm:text-left pr-8">
            <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
              Configuração Pré-Sessão
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-normal">
              Ajuste os parâmetros DDA antes de iniciar a intervenção.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 mt-6">
            {/* SEÇÃO 1: Contexto DDA */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[#0b3294] dark:text-blue-400">
                <Brain className="h-4 w-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Contexto DDA
                </h3>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-5 flex flex-col gap-4">
                {/* Nível de Estresse Inicial */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Nível de Estresse Inicial
                    </span>
                    <span
                      data-testid="valor-estresse"
                      className="text-lg font-bold text-[#0b3294] dark:text-blue-400"
                    >
                      {nivelEstresse}
                    </span>
                  </div>

                  {/* Slider de Estresse */}
                  <div className="flex flex-col gap-1">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={nivelEstresse}
                      onChange={(e) => handleNivelEstresseChange(Number(e.target.value))}
                      className="w-full h-2 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-[#0b3294] dark:accent-blue-500 hover:bg-muted-foreground/30 transition-colors"
                    />
                    <div className="flex justify-between text-2xs text-muted-foreground font-medium">
                      <span>Baixo</span>
                      <span>Alto</span>
                    </div>
                  </div>
                </div>

                {/* Gatilhos a Evitar */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-foreground">
                    Gatilhos a Evitar
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {/* Botão Som Alto */}
                    <button
                      type="button"
                      onClick={() => handleToggleGatilho("Som Alto")}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all border ${
                        gatilhosAtivos.includes("Som Alto")
                          ? "bg-[#0b3294] dark:bg-blue-600 text-white border-transparent shadow-xs hover:bg-[#061e52] dark:hover:bg-blue-700"
                          : "bg-card text-foreground border-border hover:border-muted-foreground/40 hover:bg-muted"
                      }`}
                    >
                      <VolumeX className="h-3.5 w-3.5" />
                      Som Alto
                    </button>

                    {/* Botão Luz Intensa */}
                    <button
                      type="button"
                      onClick={() => handleToggleGatilho("Luz Intensa")}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all border ${
                        gatilhosAtivos.includes("Luz Intensa")
                          ? "bg-[#0b3294] dark:bg-blue-600 text-white border-transparent shadow-xs hover:bg-[#061e52] dark:hover:bg-blue-700"
                          : "bg-card text-foreground border-border hover:border-muted-foreground/40 hover:bg-muted"
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      Luz Intensa
                    </button>

                    {/* Botão Pressão de Tempo */}
                    <button
                      type="button"
                      onClick={() => handleToggleGatilho("Pressão de Tempo")}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all border ${
                        gatilhosAtivos.includes("Pressão de Tempo")
                          ? "bg-[#0b3294] dark:bg-blue-600 text-white border-transparent shadow-xs hover:bg-[#061e52] dark:hover:bg-blue-700"
                          : "bg-card text-foreground border-border hover:border-muted-foreground/40 hover:bg-muted"
                      }`}
                    >
                      <TimerOff className="h-3.5 w-3.5" />
                      Pressão de Tempo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Pareamento Remoto */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[#0b3294] dark:text-blue-400">
                <Cast className="h-4 w-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Pareamento Remoto
                </h3>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col items-center justify-center gap-2.5 text-center">
                <span className="text-xs font-semibold text-muted-foreground">
                  Código de Pareamento
                </span>

                <div className="flex items-center justify-center gap-3">
                  <span
                    data-testid="pin-display"
                    className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-foreground"
                  >
                    {pareamento?.sessionToken || "849 - 291"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarPIN}
                    className="p-2 rounded-xl text-muted-foreground bg-card border border-border hover:border-[#0b3294] dark:hover:border-blue-400 hover:text-foreground hover:bg-muted transition-all shadow-2xs"
                    title="Copiar Código"
                  >
                    {copiado ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Status Reativo */}
                <div
                  data-testid="status-pareamento"
                  className="flex items-center justify-center gap-1.5 mt-1"
                >
                  {isPareado ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Dispositivo Conectado com Sucesso!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#0b3294] dark:text-blue-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>Aguardando conexão...</span>
                    </div>
                  )}
                </div>

                {erro && (
                  <p className="text-2xs text-destructive font-medium mt-1">{erro}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé / Ações */}
        <DialogFooter className="bg-muted/40 border-t border-border px-7 py-4 flex flex-row items-center justify-between gap-3 sm:justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelar}
            className="bg-card border-border text-foreground hover:bg-muted text-xs font-semibold px-6 py-2.5 h-auto rounded-xl shadow-2xs transition-all"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleIniciarJogo}
            disabled={!isPareado}
            className={`flex items-center gap-2 text-xs font-semibold px-6 py-2.5 h-auto rounded-xl transition-all ${
              isPareado
                ? "bg-[#0b3294] hover:bg-[#0b3294]/90 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-md hover:shadow-lg cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-80 border border-border"
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Confirmar e Iniciar Intervenção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
