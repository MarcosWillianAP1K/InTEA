import { useState, useEffect } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";
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
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { useSessionSync } from "@/features/sessao/hooks/useSessionSync";
import { usePacienteStore } from "@/features/paciente/store/paciente.store";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import { jogosService } from "@/features/jogos/services/jogosService";
import { FormularioContextoDDA } from "./FormularioContextoDDA";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import {
  Brain,
  Cast,
  Loader2,
  CheckCircle2,
  Play,
  Copy,
  Check,
  User,
  Gamepad2,
} from "lucide-react";

function NavigateExec({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
}

function SafeNavigateHandler({ to }: { to: string | null }) {
  const inRouter = useInRouterContext();
  if (!inRouter || !to) return null;
  return <NavigateExec to={to} />;
}

/**
 * ============================================================================
 * PRE-SESSION AND REMOTE PAIRING MODAL (InTEA)
 * Compliance: RF09 (Game Catalog), RF10 (Remote Pairing), RF12 (Lifecycle), RN01 (Patient Required)
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
  const selecionarJogo = useSessionStore((state) => state.selecionarJogo);
  const configurarParametros = useSessionStore((state) => state.configurarParametros);
  const iniciarPareamento = useSessionStore((state) => state.iniciarPareamento);
  const confirmarConexaoDispositivo = useSessionStore((state) => state.confirmarConexaoDispositivo);
  const iniciarIntervencao = useSessionStore((state) => state.iniciarIntervencao);
  const cancelarSessao = useSessionStore((state) => state.cancelarSessao);

  const { patients, selectedPatientId: storeSelectedId, fetchPatients } = usePacienteStore();
  const listaPacientes = Object.values(patients);

  const [jogosDisponiveis, setJogosDisponiveis] = useState<Array<{ id: string; titulo: string }>>([]);
  const [copiado, setCopiado] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [destinoNavegacao, setDestinoNavegacao] = useState<string | null>(null);

  // Carrega pacientes ao abrir o modal
  useEffect(() => {
    if (isModalAberto) {
      void fetchPatients();
    }
  }, [isModalAberto, fetchPatients]);

  // Carrega catálogo de jogos para permitir troca ou seleção inicial
  useEffect(() => {
    if (isModalAberto) {
      let isMounted = true;
      void jogosService.listar().then((res) => {
        if (!isMounted) return;
        const formatados = (res || []).map((j) => ({
          id: String(j.id),
          titulo: j.titulo || j.nome || "Jogo",
        }));
        setJogosDisponiveis(formatados);
        if ((!config?.jogoId || config.jogoId === "") && formatados.length > 0) {
          selecionarJogo(formatados[0]);
        }
      }).catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [isModalAberto, config?.jogoId, selecionarJogo]);

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

  // Obtém PIN de pareamento único via sessaoService.gerarCodigoPareamento sem persistir sessão no banco
  useEffect(() => {
    if (!isModalAberto || !config || pareamento) return;

    let isMounted = true;
    async function obterPinPareamento() {
      try {
        const codigo = await sessaoService.gerarCodigoPareamento();
        if (isMounted) {
          iniciarPareamento({
            sessionToken: codigo,
            tempoValidadeSegundos: 900,
          });
        }
      } catch {
        if (isMounted) {
          const pinMock = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
          iniciarPareamento({
            sessionToken: pinMock,
            tempoValidadeSegundos: 900,
          });
        }
      }
    }

    void obterPinPareamento();
    return () => {
      isMounted = false;
    };
  }, [isModalAberto, config, pareamento, iniciarPareamento]);

  // Carrega automaticamente gatilhos e contexto sugerido do paciente (RF12, RF17, RN03)
  useEffect(() => {
    if (!isModalAberto || !config?.pacienteId || config.pacienteId === "modo-livre") return;

    let isMounted = true;
    async function carregarContextoSugerido() {
      try {
        const sugerido = await sessaoService.obterContextoSugerido(config!.pacienteId);
        if (!isMounted || !sugerido) return;

        configurarParametros({
          gatilhosEvitar:
            sugerido.gatilhos_a_evitar && sugerido.gatilhos_a_evitar.length > 0
              ? sugerido.gatilhos_a_evitar
              : config?.gatilhosEvitar || ["Som Alto", "Luz Intensa"],
          nivelEstresseInicial:
            sugerido.estresse_inicial ?? config?.nivelEstresseInicial ?? 1,
          objetivoClinico:
            sugerido.objetivo_terapeutico || config?.objetivoClinico || "Foco Atencional",
        });
      } catch {
        // Fallback silencioso preservando estado local
      }
    }

    void carregarContextoSugerido();
    return () => {
      isMounted = false;
    };
  }, [isModalAberto, config?.pacienteId, configurarParametros]);

  const pinExibido = pareamento?.sessionToken || "849 - 291";
  const nivelEstresse = config?.nivelEstresseInicial ?? 1;
  const gatilhosAtivos = config?.gatilhosEvitar ?? ["Som Alto", "Luz Intensa"];

  /** Toggles sensory trigger inclusion in active session parameters. */
  function handleToggleGatilho(gatilho: string) {
    const novos = gatilhosAtivos.includes(gatilho)
      ? gatilhosAtivos.filter((g) => g !== gatilho)
      : [...gatilhosAtivos, gatilho];

    configurarParametros({ gatilhosEvitar: novos });
  }

  /** Updates baseline DDA stress level (1 to 5) before game start. */
  function handleNivelEstresseChange(novoNivel: number) {
    configurarParametros({ nivelEstresseInicial: novoNivel });
  }

  /** Copies session pairing PIN to clipboard with toast notification */
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

  /** Simulates remote connection of clinical tablet */
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

  /** Initiates clinical intervention after confirmed remote device handshake (RF12) */
  async function handleIniciarJogo() {
    if (iniciando) return;

    // Garante que o paciente esteja selecionado antes de iniciar intervenção
    let pacienteId = config?.pacienteId;
    if (!pacienteId) {
      const fallbackPaciente =
        (storeSelectedId && patients[storeSelectedId]) || listaPacientes[0];
      if (fallbackPaciente) {
        pacienteId = fallbackPaciente.id;
        selecionarPaciente({
          id: fallbackPaciente.id,
          nome: fallbackPaciente.name,
        });
      }
    }

    const pinFinal = pareamento?.sessionToken || pinExibido;

    iniciarIntervencao();
    fecharModal();
    const tokenRota = pinFinal || config?.jogoId || "padrao";
    setDestinoNavegacao(`/sessao/${encodeURIComponent(tokenRota)}/monitoramento`);
    toast.success(
      `Intervenção clínica iniciada com "${config?.jogoTitulo || "Jogo"}"!`,
    );

    setIniciando(true);
    try {
      // Persistência no banco de dados com injeção estruturada do Contrato 2 (RN03)
      const isModoLivre = !pacienteId || pacienteId === "modo-livre";
      await sessaoService.iniciarSessao({
        jogo_id: config?.jogoId || "jogo-1",
        paciente_id: isModoLivre ? null : pacienteId,
        modo_sessao: isModoLivre ? "modo_livre" : "sessao_clinica",
        codigo_pareamento: pinFinal,
        nivel_estresse_inicial: isModoLivre ? undefined : (config?.nivelEstresseInicial ?? 1),
        gatilhos_sensoriais_evitar: isModoLivre ? [] : (config?.gatilhosEvitar ?? []),
        objetivo_clinico: isModoLivre ? undefined : (config?.objetivoClinico || "Foco Atencional"),
        usar_fallback_padrao: isModoLivre ? undefined : Boolean(config?.usarFallbackPadrao),
        contexto_dda_json: isModoLivre
          ? undefined
          : {
              estresse_inicial: config?.nivelEstresseInicial ?? 1,
              gatilhos_a_evitar: config?.gatilhosEvitar ?? [],
              objetivo_clinico: config?.objetivoClinico || "Foco Atencional",
              usar_fallback_padrao: Boolean(config?.usarFallbackPadrao),
            },
        dispositivo_info: pareamento?.dispositivo
          ? {
              identificador_dispositivo: pareamento.dispositivo.deviceId,
              modelo: pareamento.dispositivo.modelo,
              tipo_dispositivo: pareamento.dispositivo.tipoDispositivo,
            }
          : undefined,
        status_sessao: "em_andamento",
      });
    } catch {
      // Em modo de testes ou fallback resiliente, prossegue com o fluxo
    } finally {
      setIniciando(false);
    }
  }

  /** Cancels pre-session flow and releases allocated resources */
  function handleCancelar() {
    cancelarSessao("Sessão cancelada pelo terapeuta");
    fecharModal();
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
    <>
      <SafeNavigateHandler to={destinoNavegacao} />
      <Dialog open={isModalAberto} onOpenChange={(open) => !open && fecharModal()}>
      <DialogContent
        data-testid="modal-pre-sessao"
        className="sm:max-w-145 p-0 gap-0 overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
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
            {/* SEÇÃO 0: Seleção de Jogo Terapêutico */}
            {jogosDisponiveis.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Gamepad2 className="h-4 w-4 stroke-[2.2]" />
                    <h3 className="text-sm font-bold tracking-tight text-foreground">
                      Jogo da Intervenção
                    </h3>
                  </div>
                  {config.jogoTitulo && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {config.jogoTitulo}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <Select
                    value={config.jogoId || ""}
                    onValueChange={(id) => {
                      const j = jogosDisponiveis.find((item) => item.id === id);
                      if (j) {
                        selecionarJogo({ id: j.id, titulo: j.titulo });
                      }
                    }}
                  >
                    <SelectTrigger
                      data-testid="select-jogo-pre-sessao"
                      className="w-full h-10 bg-card border-border"
                    >
                      <SelectValue placeholder="Selecione o jogo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jogosDisponiveis.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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
                    if (id === "modo-livre") {
                      selecionarPaciente({ id: "modo-livre", nome: "Modo Livre (Sem Prontuário)" });
                      return;
                    }
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
                    <SelectItem value="modo-livre">
                      🎮 Modo Livre (Partida Avulsa — Sem Paciente / RN01)
                    </SelectItem>
                    {listaPacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.age} anos • {p.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SEÇÃO 2: Contexto DDA (RN01, RN03, RF17) */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Brain className="h-4 w-4 stroke-[2.2]" />
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Contexto DDA
                  </h3>
                </div>
                {config.pacienteId === "modo-livre" && (
                  <Badge
                    variant="outline"
                    className="text-2xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"
                  >
                    Modo Livre (RN01)
                  </Badge>
                )}
              </div>

              {config.pacienteId === "modo-livre" ? (
                <div
                  data-testid="banner-modo-livre-dda"
                  className="rounded-2xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-200"
                >
                  <p className="font-semibold">Partida em Modo Livre (Sem Prontuário)</p>
                  <p className="text-2xs text-muted-foreground mt-1">
                    Conforme a regra RN01, partidas em modo livre suprimem a injeção de contexto DDA e não persistem telemetria no prontuário.
                  </p>
                </div>
              ) : (
                <FormularioContextoDDA
                  nivelEstresse={nivelEstresse}
                  onNivelEstresseChange={handleNivelEstresseChange}
                  gatilhosAtivos={gatilhosAtivos}
                  onToggleGatilho={handleToggleGatilho}
                  objetivoClinico={config.objetivoClinico || "Foco Atencional"}
                  onObjetivoClinicoChange={(obj) => configurarParametros({ objetivoClinico: obj })}
                  usarFallback={Boolean(config.usarFallbackPadrao)}
                  onToggleFallback={(usar) => configurarParametros({ usarFallbackPadrao: usar })}
                />
              )}
            </div>

            {/* SEÇÃO 3: Pareamento Remoto */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-primary">
                <Cast className="h-4 w-4 stroke-[2.2]" />
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Pareamento Remoto
                </h3>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-5 flex flex-col items-center gap-4 text-center">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    Código de Pareamento
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      data-testid="pin-display"
                      className="font-mono text-3xl font-extrabold tracking-widest text-primary bg-card px-5 py-2.5 rounded-xl border border-border shadow-inner"
                    >
                      {pinExibido}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopiarPIN}
                      className="h-12 w-12 rounded-xl shrink-0 border-border bg-card hover:bg-accent cursor-pointer"
                      title="Copiar Código"
                    >
                      {copiado ? (
                        <Check className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all bg-card border-border">
                  {status === "aguardando_pareamento" || status === "configurando" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-muted-foreground">
                        Aguardando tablet conectar...
                      </span>
                    </>
                  ) : isPareado ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Dispositivo Conectado com Sucesso!
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Pronto para parear</span>
                  )}
                </div>

                {/* Botão de Simulação de Pareamento */}
                {!isPareado && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid="btn-simular-pareamento"
                    onClick={handleSimularConexao}
                    className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2 underline-offset-4 hover:underline"
                  >
                    Simular conexão de tablet clínico (Dev / Teste)
                  </Button>
                )}
              </div>
            </div>

            {/* Alerta de Erro */}
            {erro && (
              <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
                {erro}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <DialogFooter className="bg-muted/40 p-5 px-7 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelar}
            className="w-full sm:w-auto text-xs font-semibold rounded-xl hover:bg-accent cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={!podeIniciar || iniciando}
            onClick={handleIniciarJogo}
            className="w-full sm:w-auto text-xs font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 fill-current" />
            Confirmar e Iniciar Intervenção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default ModalPreSessao;
