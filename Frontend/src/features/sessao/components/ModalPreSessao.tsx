import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { useSessionStore } from "../store/sessionStore";
import { useSessionSync } from "../hooks/useSessionSync";
import { usePacienteStore } from "@/features/paciente/store/paciente.store";
import { sessaoService } from "../services/sessaoService";
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
  User,
} from "lucide-react";

/**
 * ============================================================================
 * MODAL DE PRÉ-SESSÃO E PAREAMENTO REMOTO (InTEA — Sprint 8 / 12)
 * Requisitos: RF09 (Catálogo de Jogos), RF10 (Pareamento Remoto), RF12 (Ciclo),
 *              RN01 (Sessão Clínica exige paciente vinculado)
 * Padrão: Shadcn / Radix UI fiel ao design system clínico e Figma oficial
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
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
  const selecionarPaciente = useSessionStore((state) => state.selecionarPaciente);
  const configurarParametros = useSessionStore((state) => state.configurarParametros);
  const iniciarPareamento = useSessionStore((state) => state.iniciarPareamento);
  const confirmarConexaoDispositivo = useSessionStore((state) => state.confirmarConexaoDispositivo);
  const iniciarIntervencao = useSessionStore((state) => state.iniciarIntervencao);
  const cancelarSessao = useSessionStore((state) => state.cancelarSessao);

  const { patients, selectedPatientId: storeSelectedId } = usePacienteStore();
  const listaPacientes = Object.values(patients);

  const [copiado, setCopiado] = useState(false);

  // Inicializa paciente padrão a partir da store de pacientes caso não esteja definido
  useEffect(() => {
    if (isModalAberto && config && !config.pacienteId) {
      const padrao =
        (storeSelectedId && patients[storeSelectedId]) || listaPacientes[0];
      if (padrao) {
        selecionarPaciente({ id: padrao.id, nome: padrao.name });
      }
    }
  }, [
    isModalAberto,
    config?.pacienteId,
    storeSelectedId,
    patients,
    listaPacientes,
    selecionarPaciente,
  ]);

  // Gera PIN dinamicamente via sessaoService ou fallback para mock resiliente
  useEffect(() => {
    if (!isModalAberto || !config || pareamento) return;

    let isMounted = true;
    async function gerarPinDinamico() {
      try {
        const pacienteId =
          config?.pacienteId || storeSelectedId || listaPacientes[0]?.id || null;

        const resposta = await sessaoService.iniciarSessao({
          jogo_id: config?.jogoId || "jogo-1",
          paciente_id: pacienteId,
          modo_sessao: pacienteId ? "sessao_clinica" : "modo_livre",
          contexto_dda_json: {
            estresse_inicial: config?.nivelEstresseInicial ?? 1,
            gatilhos_a_evitar: config?.gatilhosEvitar ?? [],
          },
        });

        if (isMounted && resposta?.session_token) {
          iniciarPareamento({
            sessionToken: resposta.session_token,
            expiraEm: resposta.expira_em,
            tempoValidadeSegundos: 900,
          });
        }
      } catch {
        if (isMounted) {
          const pinMock = `${Math.floor(100 + Math.random() * 900)} - ${Math.floor(100 + Math.random() * 900)}`;
          iniciarPareamento({
            sessionToken: pinMock,
            tempoValidadeSegundos: 900,
          });
        }
      }
    }

    void gerarPinDinamico();
    return () => {
      isMounted = false;
    };
  }, [isModalAberto, config?.jogoId, pareamento, iniciarPareamento]);

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

  /** Simula conexão remota do tablet clínico */
  function handleSimularConexao() {
    if (!pareamento) {
      iniciarPareamento({
        sessionToken: pinExibido,
        tempoValidadeSegundos: 900,
      });
    }
    confirmarConexaoDispositivo({
      deviceId: "tablet-simulado",
      modelo: "Tablet Samsung Galaxy Tab S9 (Simulado)",
      tipoDispositivo: "tablet",
      bateria: 95,
      conectadoEm: new Date().toISOString(),
    });
    toast.success("Dispositivo pareado com sucesso (Simulação)!");
  }

  /** Dispara a intervenção clínica após handshake confirmado do dispositivo remoto (RF12) */
  function handleIniciarJogo() {
    // Garante que o paciente esteja selecionado antes de iniciar intervenção
    if (!config?.pacienteId) {
      const fallbackPaciente =
        (storeSelectedId && patients[storeSelectedId]) || listaPacientes[0];
      if (fallbackPaciente) {
        selecionarPaciente({
          id: fallbackPaciente.id,
          nome: fallbackPaciente.name,
        });
      }
    }

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
  const temPaciente =
    Boolean(config.pacienteId) ||
    Boolean(config.pacienteNome) ||
    listaPacientes.length > 0;
  const podeIniciar = isPareado && temPaciente;

  return (
    <Dialog open={isModalAberto} onOpenChange={(open) => !open && fecharModal()}>
      <DialogContent
        data-testid="modal-pre-sessao"
        className="sm:max-w-[580px] p-0 gap-0 overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
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
            {/* SEÇÃO 1: Seleção Dinâmica de Paciente (RN01) */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <User className="h-4 w-4 stroke-[2.2]" />
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Paciente em Atendimento
                  </h3>
                </div>
                {config.pacienteNome && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {config.pacienteNome}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <Select
                  value={config.pacienteId || ""}
                  onValueChange={(id) => {
                    const p = patients[id];
                    if (p) {
                      selecionarPaciente({ id: p.id, nome: p.name });
                    }
                  }}
                >
                  <SelectTrigger
                    data-testid="select-paciente-pre-sessao"
                    className="w-full h-10 bg-card border-border"
                  >
                    <SelectValue placeholder="Selecione o paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listaPacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.age} anos • {p.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SEÇÃO 2: Contexto DDA */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-primary">
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
                      className="text-lg font-bold text-primary"
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
                      onChange={(e) =>
                        handleNivelEstresseChange(Number(e.target.value))
                      }
                      className="w-full h-2 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary hover:bg-muted-foreground/30 transition-colors"
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
                          ? "bg-primary text-primary-foreground border-transparent shadow-xs hover:bg-primary-hover"
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
                          ? "bg-primary text-primary-foreground border-transparent shadow-xs hover:bg-primary-hover"
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
                          ? "bg-primary text-primary-foreground border-transparent shadow-xs hover:bg-primary-hover"
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

            {/* SEÇÃO 3: Pareamento Remoto */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-primary">
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
                    {pinExibido}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarPIN}
                    className="p-2 rounded-xl text-muted-foreground bg-card border border-border hover:border-primary hover:text-foreground hover:bg-muted transition-all shadow-2xs"
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
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        <span>Aguardando conexão...</span>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-simular-pareamento"
                        onClick={handleSimularConexao}
                        className="text-2xs text-primary hover:underline cursor-pointer font-medium mt-0.5"
                      >
                        Simular conexão do tablet
                      </button>
                    </div>
                  )}
                </div>

                {erro && (
                  <p className="text-2xs text-destructive font-medium mt-1">
                    {erro}
                  </p>
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
            disabled={!podeIniciar}
            className={`flex items-center gap-2 text-xs font-semibold px-6 py-2.5 h-auto rounded-xl transition-all ${
              podeIniciar
                ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-md hover:shadow-lg cursor-pointer"
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

export default ModalPreSessao;
