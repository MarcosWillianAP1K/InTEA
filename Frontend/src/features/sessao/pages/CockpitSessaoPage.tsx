import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { useSessionPersistence } from "@/features/sessao/hooks/useSessionPersistence";
import { useLiveTelemetry } from "@/features/sessao/hooks/useLiveTelemetry";
import { useClinicalTimer } from "@/features/sessao/hooks/useClinicalTimer";
import { SessionSocketManager } from "@/core/web.socket";
import { ControlesClinicos } from "@/features/sessao/components/ControlesClinicos";
import { ModalFinalizarSessao } from "../components/ModalFinalizarSessao";
import { ModalAnotacaoSessaoAtiva } from "../components/ModalAnotacaoSessaoAtiva";
import { TelemetriaCards } from "@/features/sessao/components/telemetria/TelemetriaCards";
import { TelemetriaChart } from "@/features/sessao/components/telemetria/TelemetriaChart";
import { TabletDiagnosticCard } from "@/features/sessao/components/telemetria/TabletDiagnosticCard";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import {
  Gamepad2,
  Clock,
  ArrowLeft,
} from "lucide-react";

/**
 * ============================================================================
 * PAGE: CockpitSessaoPage (Clinical Session Monitoring)
 * Route: /sessao/:id/monitoramento
 * Compliance: RF12 (Session Management), RF13 (Lifecycle), RF16 (Anotações Clínicas),
 *             RF17 (DDA Context), RF21 (Intervenção Manual), RN01 (Modo Livre)
 * ============================================================================
 */
export function CockpitSessaoPage() {
  const { id: paramSessaoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 1. Hidratação e persistência tolerante a F5
  useSessionPersistence();

  // 2. Stores e estado da sessão
  const status = useSessionStore((state) => state.status);
  const config = useSessionStore((state) => state.config);
  const pareamento = useSessionStore((state) => state.pareamento);
  const isPausado = useSessionStore((state) => state.isPausado ?? false);
  const nivelDdaAtual = useSessionStore((state) => state.nivelDdaAtual ?? 1);

  const pausarSessao = useSessionStore((state) => state.pausarSessao);
  const retomarSessao = useSessionStore((state) => state.retomarSessao);
  const ajustarDda = useSessionStore((state) => state.ajustarDda);
  const finalizarSessao = useSessionStore((state) => state.finalizarSessao);
  const restaurarSessao = useSessionStore((state) => state.restaurarSessao);

  // Sincronização do Cockpit com a Sessão Clínica (Backend / API / BD)
  // REGRA CLÍNICA: O Cockpit DEVE aparecer SOMENTE quando a sessão está em andamento (RN01, RF12, RF13)
  useEffect(() => {
    let ativo = true;

    async function sincronizarSessaoCockpit() {
      if (!paramSessaoId) return;

      // Se a sessão já estiver ativa no Zustand com os dados consistentes, evita re-fetch cíclico
      if (
        status === "em_andamento" &&
        (pareamento?.sessionToken === paramSessaoId || config?.jogoTitulo)
      ) {
        return;
      }

      try {
        // Busca a sessão no backend/mock por ID ou Token de Pareamento
        let sessaoEncontrada = await sessaoService.buscarPorId(paramSessaoId);
        if (!sessaoEncontrada) {
          sessaoEncontrada = await sessaoService.buscarPorToken(paramSessaoId);
        }

        if (!ativo) return;

        if (!sessaoEncontrada) {
          toast.error("Sessão clínica não localizada.");
          navigate("/painel");
          return;
        }

        // Se a sessão já foi finalizada, o Cockpit não deve aparecer: redireciona para a tela de resultado
        if (sessaoEncontrada.status_sessao === "finalizada") {
          toast.info("Esta sessão clínica já foi finalizada. Redirecionando para o relatório.");
          navigate(`/sessao/${encodeURIComponent(sessaoEncontrada.id || paramSessaoId)}/resultado`);
          return;
        }

        // Se a sessão estiver cancelada ou expirada, volta ao painel
        if (
          sessaoEncontrada.status_sessao === "cancelada" ||
          sessaoEncontrada.status_sessao === "expirada" ||
          sessaoEncontrada.status_sessao === "interrompida_por_queda"
        ) {
          toast.warning(
            `Sessão com status '${sessaoEncontrada.status_sessao}'. O Cockpit está disponível apenas para sessões em andamento.`
          );
          navigate("/painel");
          return;
        }

        // Sessão válida em andamento: hidrata o store e sincroniza controles
        const nomePaciente =
          sessaoEncontrada.paciente?.nome ||
          (sessaoEncontrada.modo_sessao === "modo_livre" ? "Modo Livre" : "Paciente em Atendimento");
        const tituloJogo =
          sessaoEncontrada.jogo?.titulo || sessaoEncontrada.jogo?.nome || "Aventura das Cores";
        const ddaJson = sessaoEncontrada.contexto_dda_json as Record<string, unknown> | undefined;

        restaurarSessao({
          status: "em_andamento",
          sessaoId: sessaoEncontrada.id || paramSessaoId,
          config: {
            pacienteId: sessaoEncontrada.paciente_id || sessaoEncontrada.paciente?.id || null,
            pacienteNome: nomePaciente,
            jogoId: sessaoEncontrada.jogo_id,
            jogoTitulo: tituloJogo,
            objetivoClinico: (ddaJson?.objetivo_clinico as string) || "Atenção Compartilhada",
            focoTerapeutico: (ddaJson?.objetivo_clinico as string) || "Atenção Compartilhada",
          },
          pareamento: {
            sessionToken: sessaoEncontrada.session_token,
            codigoFormatado: sessaoEncontrada.session_token,
            expiraEm: sessaoEncontrada.expira_em || new Date(Date.now() + 3600000).toISOString(),
            tempoValidadeSegundos: 3600,
            dispositivo: {
              deviceId: sessaoEncontrada.dispositivo_info?.modelo || "tablet-clinico-1",
              tipoDispositivo: (sessaoEncontrada.dispositivo_info?.tipo_dispositivo as "tablet" | "vr") || "tablet",
              modelo: sessaoEncontrada.dispositivo_info?.modelo || "Tablet Clínico Pareado",
              bateria: sessaoEncontrada.dispositivo_info?.bateria ?? 88,
              latenciaMs: sessaoEncontrada.dispositivo_info?.latencia_ms ?? 22,
              conectadoEm: sessaoEncontrada.data_hora_inicio || new Date().toISOString(),
            },
          },
          dataHoraInicio: sessaoEncontrada.data_hora_inicio || new Date().toISOString(),
          nivelDdaAtual: Number(ddaJson?.nivel_dificuldade_inicial ?? ddaJson?.estresse_inicial ?? 2),
          isPausado:
            sessaoEncontrada.status_sessao === "pausada"
              ? true
              : (useSessionStore.getState().isPausado ?? false),
        });

        // Entra na sala do WebSocket para streaming de telemetria
        if (sessaoEncontrada.session_token) {
          SessionSocketManager.getInstance().entrarSala(sessaoEncontrada.session_token);
        }
      } catch (err) {
        console.error("Erro ao sincronizar sessão no Cockpit:", err);
      }
    }

    void sincronizarSessaoCockpit();

    return () => {
      ativo = false;
    };
  }, [paramSessaoId, status, pareamento, config, restaurarSessao, navigate]);

  // 3. Telemetria em tempo real
  const { metricas, historico } = useLiveTelemetry({
    habilitado: status === "em_andamento",
  });

  // 4. Modais (Encerramento e Anotações Clínicas em Tempo Real)
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [isSubmittingFinalizar, setIsSubmittingFinalizar] = useState(false);
  const [modalAnotacaoAberto, setModalAnotacaoAberto] = useState(false);

  // 5. Cronômetro clínico de alta precisão sincronizado com Dashboard e resiliente (Card 5 - Fix, RF12, RF21)
  const idSessaoEfetivo = paramSessaoId || pareamento?.sessionToken || "sessao-ativa";
  const tokenSessao = pareamento?.sessionToken || paramSessaoId || "sessao-ativa";
  const dataHoraInicioStore = useSessionStore((state) => state.dataHoraInicio);
  const { tempoFormatado } = useClinicalTimer({
    sessaoId: idSessaoEfetivo,
    ativo: status === "em_andamento",
    isPausado,
    dataHoraInicioInicial: dataHoraInicioStore,
  });

  // Determina se a sessão ativa está em Modo Livre (sem paciente associado - RN01)
  const isModoLivre = !config?.pacienteId;

  // Handlers de intervenção clínica imediata

  /** Dispatches pause command to store, remote game via WebSocket, and backend REST (RF21 — Manual Intervention). */
  const handlePausar = () => {
    pausarSessao();
    SessionSocketManager.getInstance().enviarComando({
      tipo: "pausar",
      sessionToken: pareamento?.sessionToken || idSessaoEfetivo,
    });
    void sessaoService.atualizarStatus(idSessaoEfetivo, "pausada");
    toast.info("Comando de pausa enviado ao jogo remoto.");
  };

  /** Envia comando de retomada ao store e ao jogo remoto via WebSocket (RF21) */
  const handleRetomar = () => {
    retomarSessao();
    SessionSocketManager.getInstance().enviarComando({
      tipo: "retomar",
      sessionToken: pareamento?.sessionToken || idSessaoEfetivo,
    });
    void sessaoService.atualizarStatus(idSessaoEfetivo, "em_andamento");
    toast.success("Intervenção retomada no dispositivo.");
  };

  /** Adjusts DDA level in store and broadcasts command to remote device (RF17, RN03). */
  const handleAjustarDda = (nivel: number) => {
    ajustarDda(nivel);
    SessionSocketManager.getInstance().enviarComando({
      tipo: "ajustar_dda",
      sessionToken: tokenSessao,
      parametros: { nivelDda: nivel },
    });
    toast.success(`Dificuldade DDA ajustada para o nível ${nivel}.`);
  };

  /**
   * Confirms formal session conclusion, persisting state machine, AI, and audit trail in backend via REST.
   */
  const handleConfirmarFinalizacao = async (anotacoes: string) => {
    setIsSubmittingFinalizar(true);
    try {
      finalizarSessao(anotacoes);

      // Envia notificação de encerramento via WebSocket para o tablet
      SessionSocketManager.getInstance().finalizarSessaoRemota(tokenSessao);

      // Persiste formalmente no backend via REST (máquina de estados, IA e auditoria)
      const idOuToken = paramSessaoId || tokenSessao;
      if (idOuToken) {
        await sessaoService.finalizar(idOuToken, anotacoes);
      }

      setModalFinalizarAberto(false);

      if (isModoLivre) {
        toast.info(
          "Partida em Modo Livre concluída sem persistência em prontuário."
        );
        navigate("/games");
      } else {
        toast.success("Sessão finalizada com sucesso! Prontuário atualizado.");
        navigate(`/sessao/${encodeURIComponent(idOuToken)}/resultado`);
      }
    } catch {
      toast.error("Erro ao consolidar finalização da sessão.");
    } finally {
      setIsSubmittingFinalizar(false);
    }
  };

  const nomePaciente = config?.pacienteNome || "Paciente em Atendimento";
  const tituloJogo = config?.jogoTitulo || "Jogo Terapêutico";
  const dispositivo = pareamento?.dispositivo;

  return (
    <div
      data-testid="cockpit-sessao-page"
      className="min-h-screen bg-background text-foreground flex flex-col"
    >
      {/* Topo / Header do Cockpit */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Esquerda: Identificação do Paciente e Jogo */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/games")}
            className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Voltar aos Jogos"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                data-testid="cockpit-paciente-nome"
                className="text-base font-bold text-foreground tracking-tight"
              >
                {nomePaciente}
              </span>
              <Badge
                variant="outline"
                className="text-2xs bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/40"
              >
                {isModoLivre ? "Modo Livre" : "Prontuário Ativo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gamepad2 className="h-3.5 w-3.5 text-primary" />
              <span data-testid="cockpit-jogo-titulo" className="font-medium text-foreground/80">
                {tituloJogo}
              </span>
              <span>•</span>
              <span className="font-mono text-2xs">PIN: {tokenSessao}</span>
            </div>
          </div>
        </div>

        {/* Direita: Cronômetro e Badges */}
        <div className="flex items-center gap-4">
          {/* Cronômetro */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border">
            <Clock
              className={`h-4 w-4 ${
                isPausado
                  ? "text-amber-500 animate-pulse"
                  : "text-primary"
              }`}
            />
            <span
              data-testid="cronometro-sessao"
              className="font-mono text-sm sm:text-base font-bold tracking-wider text-foreground"
            >
              {tempoFormatado}
            </span>
          </div>

          {/* Status Badge */}
          <Badge
            data-testid="status-sessao-badge"
            variant="outline"
            className={`text-xs font-semibold px-2.5 py-1 ${
              isPausado
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : status === "em_andamento"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {isPausado ? "Em Pausa" : status === "em_andamento" ? "Em Andamento" : status}
          </Badge>
        </div>
      </header>

      {/* Conteúdo Principal do Cockpit */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Seção 1: Barra de Controles Clínicos do Terapeuta */}
        <section aria-label="Controles Clínicos">
          <ControlesClinicos
            isPausado={isPausado}
            nivelDda={nivelDdaAtual}
            onPausar={handlePausar}
            onRetomar={handleRetomar}
            onAjustarDda={handleAjustarDda}
            onAbrirModalFinalizar={() => setModalFinalizarAberto(true)}
            onAbrirAnotacoes={() => setModalAnotacaoAberto(true)}
            isModoLivre={isModoLivre}
          />
        </section>

        {/* Seção 2: Cards de Telemetria ao Vivo */}
        <section aria-label="Métricas Clínicas">
          <TelemetriaCards metricas={metricas} />
        </section>

        {/* Seção 3: Grid de Gráfico Temporal e Diagnóstico do Dispositivo */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TelemetriaChart historico={historico} />
          </div>

          <div className="lg:col-span-1">
            <TabletDiagnosticCard
              latenciaMs={dispositivo?.latenciaMs ?? 38}
              bateria={dispositivo?.bateria ?? 92}
              dispositivoNome={dispositivo?.modelo || "Tablet Clínico Pareado"}
              isConectado={status === "em_andamento" || status === "pareado"}
            />
          </div>
        </section>
      </main>

      {/* Modal de Anotações Clínicas em Tempo Real */}
      <ModalAnotacaoSessaoAtiva
        aberto={modalAnotacaoAberto}
        onFechar={() => setModalAnotacaoAberto(false)}
        sessaoId={paramSessaoId || tokenSessao}
        pacienteId={config?.pacienteId}
        pacienteNome={config?.pacienteNome}
        isModoLivre={isModoLivre}
      />

      {/* Modal de Confirmação de Finalização */}
      <ModalFinalizarSessao
        aberto={modalFinalizarAberto}
        tempoDecorrido={tempoFormatado}
        isSubmitting={isSubmittingFinalizar}
        onCancelar={() => setModalFinalizarAberto(false)}
        onConfirmar={handleConfirmarFinalizacao}
      />
    </div>
  );
}

export default CockpitSessaoPage;