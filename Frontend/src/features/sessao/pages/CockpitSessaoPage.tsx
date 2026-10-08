import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import { useSessionPersistence } from "../hooks/useSessionPersistence";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { SessionSocketManager } from "@/core/web.socket";
import { ControlesClinicos } from "../components/ControlesClinicos";
import { ModalFinalizarSessao } from "../components/ModalFinalizarSessao";
import { TelemetriaCards } from "../components/telemetria/TelemetriaCards";
import { TelemetriaChart } from "../components/telemetria/TelemetriaChart";
import { TabletDiagnosticCard } from "../components/telemetria/TabletDiagnosticCard";
import { sessaoService } from "../services/sessaoService";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import {
  Gamepad2,
  User,
  Clock,
  ArrowLeft,
  Activity,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

/**
 * ============================================================================
 * PÁGINA: CockpitSessaoPage (Front-end 1 — Hermeson Alves / Card 3.1)
 * Rota: /sessao/:id/monitoramento
 * Requisitos: RF12 (Gestão de Sessão), RF13 (Ciclo), RF17 (Contexto DDA), RF21
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

  // 3. Telemetria em tempo real
  const { metricas, historico } = useLiveTelemetry({
    habilitado: status === "em_andamento",
  });

  // 4. Modal de encerramento
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [isSubmittingFinalizar, setIsSubmittingFinalizar] = useState(false);

  // 5. Cronômetro clínico de alta precisão
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);

  useEffect(() => {
    if (status !== "em_andamento" || isPausado) return;

    const timer = setInterval(() => {
      setSegundosDecorridos((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isPausado]);

  // Formata segundos para MM:SS ou HH:MM:SS
  const formatarTempo = (totalSegundos: number) => {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    if (horas > 0) {
      return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
    }
    return `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
  };

  const tempoFormatado = formatarTempo(segundosDecorridos);

  // Handlers de intervenção clínica imediata
  const tokenSessao = pareamento?.sessionToken || paramSessaoId || "sessao-ativa";

  const handlePausar = () => {
    pausarSessao();
    SessionSocketManager.getInstance().enviarComando({
      tipo: "pausar",
      sessionToken: tokenSessao,
    });
    toast.info("Comando de pausa enviado ao jogo remoto.");
  };

  const handleRetomar = () => {
    retomarSessao();
    SessionSocketManager.getInstance().enviarComando({
      tipo: "retomar",
      sessionToken: tokenSessao,
    });
    toast.success("Intervenção retomada no dispositivo.");
  };

  const handleAjustarDda = (nivel: number) => {
    ajustarDda(nivel);
    SessionSocketManager.getInstance().enviarComando({
      tipo: "ajustar_dda",
      sessionToken: tokenSessao,
      parametros: { nivelDda: nivel },
    });
    toast.success(`Dificuldade DDA ajustada para o nível ${nivel}.`);
  };

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

      toast.success("Sessão finalizada com sucesso! Prontuário atualizado.");
      setModalFinalizarAberto(false);
      navigate("/games");
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
                className="text-2xs bg-blue-50 text-[#0b3294] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
              >
                Prontuário Ativo
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gamepad2 className="h-3.5 w-3.5 text-[#0b3294] dark:text-blue-400" />
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
                  : "text-[#0b3294] dark:text-blue-400"
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
