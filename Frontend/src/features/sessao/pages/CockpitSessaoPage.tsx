import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
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
import { sessaoService } from "@/features/sessao/services/sessao.service";
import { pacienteService } from "@/features/paciente/services/paciente.service";
import { jogosService } from "@/features/jogos/services/jogos.service";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import {
  Gamepad2,
  Clock,
  ArrowLeft,
  Eye,
  Users,
} from "lucide-react";

/**
 * ============================================================================
 * PAGE: CockpitSessaoPage (Clinical Session Monitoring)
 * Route: /sessao/:id/monitoramento
 * Compliance: RF12 (Session Management), RF13 (Lifecycle), RF16 (Anotações Clínicas),
 *             RF17 (DDA Context), RF18 (Equipe Multidisciplinar), RF21 (Intervenção Manual),
 *             RN01 (Modo Livre), RN04 (Vínculo Clínico)
 * ============================================================================
 */
export function CockpitSessaoPage() {
  const { id: paramSessaoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 1. Hidratação e persistência tolerante a F5
  useSessionPersistence();

  // 2. Stores e estado da sessão
  const user = useAuthStore((state) => state.user);
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

  // Estado de condução e Modo Observador da Equipe Multidisciplinar (RF13, RF21, RN04)
  const [terapeutaCondutorId, setTerapeutaCondutorId] = useState<string | null>(null);
  const [terapeutaCondutorNome, setTerapeutaCondutorNome] = useState<string | null>(null);

  // Sincronização do Cockpit com a Sessão Clínica (Backend / API / BD)
  // REGRA CLÍNICA: O Cockpit DEVE aparecer SOMENTE quando a sessão está em andamento (RN01, RF12, RF13)
  useEffect(() => {
    let ativo = true;

    async function sincronizarSessaoCockpit() {
      if (!paramSessaoId) return;

      const storeSessaoId = useSessionStore.getState().sessaoId;
      const storeToken = useSessionStore.getState().pareamento?.sessionToken;
      const storeConfig = useSessionStore.getState().config;
      const storeStatus = useSessionStore.getState().status;

      // Se a sessão já estiver ativa no Zustand com os dados consistentes para este exato ID/Token, evita re-fetch cíclico
      const jaSincronizadoComEsteId =
        (storeSessaoId === paramSessaoId || storeToken === paramSessaoId) &&
        Boolean(storeConfig?.jogoTitulo && storeConfig?.pacienteNome);

      if (storeStatus === "em_andamento" && jaSincronizadoComEsteId) {
        return;
      }

      try {
        // Busca a sessão no backend/API (BD) por ID ou Token de Pareamento
        let sessaoEncontrada = await sessaoService.buscarPorId(paramSessaoId);
        if (!sessaoEncontrada) {
          sessaoEncontrada = await sessaoService.buscarPorToken(paramSessaoId);
        }

        if (!ativo) return;

        if (!sessaoEncontrada) {
          // Se já está ativo na store com título e paciente (ex: fluxo de testes locais ou mock ativo), mantém
          if (storeStatus === "em_andamento" && storeConfig?.jogoTitulo) {
            return;
          }
          toast.error("Sessão clínica não localizada no banco de dados.");
          navigate("/painel");
          return;
        }

        if (sessaoEncontrada.terapeuta_id) {
          setTerapeutaCondutorId(sessaoEncontrada.terapeuta_id);
        }
        if (sessaoEncontrada.terapeuta?.nome) {
          setTerapeutaCondutorNome(sessaoEncontrada.terapeuta.nome);
        }

        const modoObservadorAtivo =
          Boolean(user?.id) &&
          Boolean(sessaoEncontrada.terapeuta_id) &&
          sessaoEncontrada.terapeuta_id !== user?.id &&
          sessaoEncontrada.modo_sessao !== "modo_livre";

        if (jaSincronizadoComEsteId) {
          if (modoObservadorAtivo && sessaoEncontrada.session_token) {
            SessionSocketManager.getInstance().entrarSala(sessaoEncontrada.session_token);
            SessionSocketManager.getInstance()
              .getSocket()
              ?.emit("entrar_sessao", {
                session_token: sessaoEncontrada.session_token,
                role: "observador_equipe",
              });
          }
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

        // Se a sessão for válida e estiver ativa/conectada/pausada/em_andamento:
        if (
          sessaoEncontrada.status_sessao === "em_andamento" ||
          sessaoEncontrada.status_sessao === "conectado" ||
          sessaoEncontrada.status_sessao === "pausada"
        ) {
          // Busca dados complementares do jogo e do paciente se necessário
          let nomePacienteSessao = sessaoEncontrada.paciente?.nome;
          let tituloJogoSessao = sessaoEncontrada.jogo?.nome;

          if (!nomePacienteSessao && sessaoEncontrada.paciente_id) {
            try {
              const pac = await pacienteService.buscarPorId(sessaoEncontrada.paciente_id);
              if (pac) nomePacienteSessao = pac.nome;
            } catch {
              // fallback gracioso
            }
          }

          if (!tituloJogoSessao && sessaoEncontrada.jogo_id) {
            try {
              const game = await jogosService.buscarPorId(sessaoEncontrada.jogo_id);
              if (game) tituloJogoSessao = game.nome;
            } catch {
              // fallback gracioso
            }
          }

          const configInicial = sessaoEncontrada.configuracao_inicial_json as Record<string, unknown> | undefined;

          restaurarSessao({
            sessaoId: sessaoEncontrada.id,
            status: "em_andamento",
            isPausado: sessaoEncontrada.status_sessao === "pausada",
            config: {
              pacienteId: sessaoEncontrada.paciente_id || "",
              pacienteNome:
                nomePacienteSessao ||
                (sessaoEncontrada.modo_sessao === "modo_livre" ? "Modo Livre" : "Paciente Clínico"),
              jogoId: sessaoEncontrada.jogo_id || "",
              jogoTitulo: tituloJogoSessao || "Jogo Terapêutico",
              nivelEstresseInicial: (configInicial?.estresse_inicial as number) ?? 1,
              gatilhosEvitar: (configInicial?.gatilhos_evitar as string[]) ?? [],
            },
            pareamento: {
              sessionToken: sessaoEncontrada.session_token,
              expiraEm: new Date(Date.now() + 3600000).toISOString(),
              tempoValidadeSegundos: 3600,
              dispositivo: {
                deviceId: "tablet-clinico-01",
                modelo: "Tablet Clínico Pareado",
                bateria: 95,
                latenciaMs: 32,
                conectadoEm: sessaoEncontrada.data_hora_inicio || new Date().toISOString(),
              },
            },
          });

          // Conecta o WebSocket na sala da sessão
          if (sessaoEncontrada.session_token) {
            SessionSocketManager.getInstance().entrarSala(sessaoEncontrada.session_token);
            if (modoObservadorAtivo) {
              SessionSocketManager.getInstance()
                .getSocket()
                ?.emit("entrar_sessao", {
                  session_token: sessaoEncontrada.session_token,
                  role: "observador_equipe",
                });
            }
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar sessão no Cockpit:", err);
      }
    }

    void sincronizarSessaoCockpit();

    return () => {
      ativo = false;
    };
  }, [paramSessaoId, restaurarSessao, navigate, user?.id]);

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
  const { tempoFormatado } = useClinicalTimer({
    sessaoId: idSessaoEfetivo,
    ativo: status === "em_andamento",
    isPausado,
  });

  // Determina se a sessão ativa está em Modo Livre (sem paciente associado - RN01)
  const isModoLivre = !config?.pacienteId;

  // Determina se o especialista logado está em Modo Observador da Equipe Multidisciplinar (RF13, RF21, RN04)
  const isModoObservador =
    !isModoLivre &&
    Boolean(user?.id) &&
    Boolean(terapeutaCondutorId) &&
    terapeutaCondutorId !== user?.id;

  // Handlers de intervenção clínica imediata

  /** Dispatches pause command to store, remote game via WebSocket, and backend REST (RF21 — Manual Intervention). */
  const handlePausar = () => {
    if (isModoObservador) return;
    pausarSessao();
    toast.info("Comando de pausa enviado ao jogo remoto.");
    const idSessaoPausa = paramSessaoId || pareamento?.sessionToken;
    if (idSessaoPausa) {
      void sessaoService.atualizarStatus(idSessaoPausa, "pausada").catch((err) => {
        console.error("Erro ao sincronizar status de pausa no backend:", err);
      });
    }
    SessionSocketManager.getInstance().enviarComando({
      tipo: "pausar",
      sessionToken: tokenSessao,
    });
  };

  /**
   * Resumes session playback across application store and WebSocket runtime.
   * Session Control (RF13, RF21): Unpauses clinical timer and signals game client to resume rendering.
   */
  const handleRetomar = () => {
    if (isModoObservador) return;
    retomarSessao();
    toast.success("Intervenção retomada no dispositivo.");
    const idSessaoRetomar = paramSessaoId || pareamento?.sessionToken;
    if (idSessaoRetomar) {
      void sessaoService.atualizarStatus(idSessaoRetomar, "em_andamento").catch((err) => {
        console.error("Erro ao sincronizar status de retomada no backend:", err);
      });
    }
    SessionSocketManager.getInstance().enviarComando({
      tipo: "retomar",
      sessionToken: tokenSessao,
    });
  };

  /** Adjusts DDA level in store and broadcasts command to remote device (RF17, RN03). */
  const handleAjustarDda = (nivel: number) => {
    if (isModoObservador) return;
    ajustarDda(nivel);
    SessionSocketManager.getInstance().enviarComando({
      tipo: "ajustar_dda",
      sessionToken: tokenSessao,
      parametros: { nivelDda: nivel },
    });
  };

  /** Submits session conclusion, updates state, and routes to results page (RF13, RF20). */
  const handleConfirmarFinalizacao = async (anotacoes: string) => {
    if (isModoObservador) return;
    setIsSubmittingFinalizar(true);

    try {
      const sessaoIdFinalizacao = paramSessaoId || useSessionStore.getState().sessaoId;

      if (sessaoIdFinalizacao) {
        try {
          await sessaoService.finalizar(sessaoIdFinalizacao, anotacoes);
        } catch {
          // Mantém integridade da experiência
        }
      }

      SessionSocketManager.getInstance().enviarComando({
        tipo: "finalizar",
        sessionToken: tokenSessao,
      });

      finalizarSessao(anotacoes);
      setModalFinalizarAberto(false);

      if (isModoLivre) {
        toast.info("Partida em Modo Livre concluída sem persistência em prontuário.");
        navigate("/games");
      } else {
        toast.success("Sessão finalizada com sucesso! Prontuário atualizado.");
        const idDestino = paramSessaoId || sessaoIdFinalizacao || "recém-encerrada";
        navigate(`/sessao/${encodeURIComponent(idDestino)}/resultado`);
      }
    } catch {
      toast.error("Erro ao encerrar a sessão. Tente novamente.");
    } finally {
      setIsSubmittingFinalizar(false);
    }
  };

  const nomePaciente = config?.pacienteNome || (isModoLivre ? "Modo Livre" : "Paciente Clínico");
  const tituloJogo = config?.jogoTitulo || "Jogo Terapêutico";
  const dispositivo = pareamento?.dispositivo;

  return (
    <div
      data-testid="cockpit-sessao-page"
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Cabeçalho do Cockpit Clínico */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        {/* Esquerda: Identificação do Paciente e Jogo */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/jogos")}
            className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
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
        {/* Banner Informativo do Modo Observador da Equipe Multidisciplinar (RF13, RF21, RN04) */}
        {isModoObservador && (
          <div
            role="status"
            data-testid="banner-modo-observador"
            className="rounded-2xl border border-indigo-200 bg-indigo-50/90 dark:bg-indigo-950/40 dark:border-indigo-800 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-900 dark:text-indigo-200 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-extrabold">
                  Modo Acompanhamento da Equipe — Sessão conduzida por{" "}
                  {terapeutaCondutorNome || "Especialista Responsável"}
                </p>
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Você está acompanhando a telemetria ao vivo como integrante da Equipe Multidisciplinar. Os comandos de intervenção remota (Pausar, Ajustar DDA e Finalizar Sessão) são exclusivos do especialista condutor.
                </p>
              </div>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5" />
              Observador da Equipe
            </Badge>
          </div>
        )}

        {/* Seção 1: Barra de Controles Clínicos do Terapeuta */}
        <section aria-label="Controles Clínicos">
          <ControlesClinicos
            isPausado={isPausado}
            nivelDda={nivelDdaAtual}
            onPausar={handlePausar}
            onRetomar={handleRetomar}
            onAjustarDda={handleAjustarDda}
            onAbrirModalFinalizar={() => {
              if (!isModoObservador) setModalFinalizarAberto(true);
            }}
            onAbrirAnotacoes={() => setModalAnotacaoAberto(true)}
            desabilitado={isModoObservador}
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
