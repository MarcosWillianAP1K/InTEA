import { useNavigate } from "react-router-dom";
import { Gamepad2, Clock, CheckCircle2, Activity, Eye, XCircle, Play, Pause } from "lucide-react";
import { useClinicalTimer } from "../hooks/useClinicalTimer";
import { useSessionStore } from "../store/sessionStore";
import { SessionSocketManager } from "@/core/web.socket";
import { sessaoService } from "../services/sessao.service";

/**
 * ============================================================================
 * COMPONENTE CARD SESSÃO COM TIMER SINCRONIZADO (InTEA)
 * Figma: 'sessão - InTEA' (Node ID: '61:759')
 * Conformidade: RF12 (Cockpit da Sessão), RF13 (Finalização da Sessão), RF21 (Pausa e Retomada)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface CardSessaoTimerProps {
  sessaoId?: string;
  pacienteNome?: string;
  jogoTitulo?: string;
  tempoFormatado?: string;
  duracaoSegundos?: number;
  dataHoraInicio?: string;
  status?: "conectado" | "em_andamento" | "pausada" | "finalizada" | "cancelada" | "expirada" | string;
  isPausado?: boolean;
  onTogglePausa?: () => void;
  onCockpitClick?: () => void;
  onConcluirClick?: () => void;
  onVerRelatorioClick?: () => void;
  className?: string;
  "data-testid"?: string;
}

function formatarSegundos(segundos?: number): string {
  if (segundos === undefined || segundos === null) return "14:55";
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function CardSessaoTimer({
  sessaoId,
  pacienteNome = "João Betinha da Silva",
  jogoTitulo = "Caminho das Cores",
  tempoFormatado,
  duracaoSegundos,
  dataHoraInicio,
  status = "conectado",
  isPausado: isPausadoProp,
  onTogglePausa,
  onCockpitClick,
  onConcluirClick,
  onVerRelatorioClick,
  className = "",
  "data-testid": testId,
}: CardSessaoTimerProps) {
  const navigate = useNavigate();

  const storeIsPausado = useSessionStore((state) => state.isPausado);
  const storeSessaoId = useSessionStore((state) => state.sessaoId || state.pareamento?.sessionToken);

  const isEmAndamento =
    status === "em_andamento" ||
    status === "conectado" ||
    status === "pausada";

  const isFinalizada = status === "finalizada" || status === "concluida";

  // Identifica se esta sessão específica está em pausa
  const isMesmaSessao = !sessaoId || !storeSessaoId || sessaoId === storeSessaoId;
  const isSessaoPausada = Boolean(
    isPausadoProp ?? (status === "pausada" || (isEmAndamento && isMesmaSessao && storeIsPausado))
  );

  // Utiliza o hook clínico unificado compartilhado com o Cockpit (RF12, RF21)
  const timer = useClinicalTimer({
    sessaoId: sessaoId || "sessao-ativa",
    ativo: isEmAndamento,
    isPausado: isSessaoPausada,
    dataHoraInicioInicial: dataHoraInicio,
  });

  const tempoExibido =
    tempoFormatado ??
    (duracaoSegundos !== undefined && !dataHoraInicio
      ? formatarSegundos(duracaoSegundos)
      : isEmAndamento
        ? timer.tempoFormatado
        : formatarSegundos(duracaoSegundos));

  const handleAcessarCockpit = () => {
    if (onCockpitClick) {
      onCockpitClick();
    } else if (sessaoId) {
      navigate(`/sessao/${sessaoId}/monitoramento`);
    }
  };

  const handleConcluir = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConcluirClick) {
      onConcluirClick();
    } else if (sessaoId) {
      navigate(`/sessao/${sessaoId}/resultado`);
    }
  };

  const handleVerRelatorio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVerRelatorioClick) {
      onVerRelatorioClick();
    } else if (sessaoId) {
      navigate(`/sessao/${sessaoId}/resultado`);
    }
  };

  const handleTogglePausa = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePausa) {
      onTogglePausa();
      return;
    }

    const novoPausado = !isSessaoPausada;
    const novoStatus = novoPausado ? "pausada" : "em_andamento";

    if (novoPausado) {
      useSessionStore.getState().pausarSessao();
      SessionSocketManager.getInstance().enviarComando({
        tipo: "pausar",
        sessionToken: storeSessaoId || sessaoId || "sessao-ativa",
      });
    } else {
      useSessionStore.getState().retomarSessao();
      SessionSocketManager.getInstance().enviarComando({
        tipo: "retomar",
        sessionToken: storeSessaoId || sessaoId || "sessao-ativa",
      });
    }

    if (sessaoId) {
      try {
        await sessaoService.atualizarStatus(sessaoId, novoStatus);
      } catch (err) {
        console.error("Erro ao sincronizar status de pausa no backend:", err);
      }
    }
  };

  return (
    <div
      data-testid={testId || (sessaoId ? `sessao-card-${sessaoId}` : "card-sessao-timer")}
      className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-8 px-5 py-4 rounded-xl bg-surface border border-border-subtle shadow-xs hover:shadow-sm transition-all ${className}`}
    >
      {/* 1. SEÇÃO ATIVIDADE (Figma: 'Atividade') */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center rounded-lg bg-surface-highlight p-2.5 text-primary shrink-0">
          <Gamepad2 className="h-6 w-6 stroke-2" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-2xs font-medium text-foreground truncate">
            {pacienteNome}
          </span>
          <span className="text-base sm:text-lg font-semibold text-primary truncate">
            Atividade atual: {jogoTitulo}
          </span>
        </div>
      </div>

      {/* 2. SEÇÃO COUNTDOWN TIMER & AÇÃO (Figma: 'Countdown timer') */}
      <div className="flex flex-wrap items-center justify-between md:justify-center gap-3">
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-surface-highlight">
          <div className="flex items-center gap-2">
            <Clock
              className={`h-5 w-5 ${
                isSessaoPausada
                  ? "text-amber-500"
                  : isEmAndamento
                    ? "text-amber-500 animate-pulse"
                    : "text-primary"
              } shrink-0`}
            />
            <span
              data-testid="countdown-display"
              className={`font-mono text-xl sm:text-2xl font-bold tracking-tight ${
                isSessaoPausada || isEmAndamento
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-primary"
              }`}
            >
              {tempoExibido}
            </span>
          </div>

          {/* Botão de Concluir sessão SOMENTE para sessões ativas (em andamento ou em pausa) */}
          {isEmAndamento && (
            <button
              type="button"
              onClick={handleConcluir}
              className="flex items-center justify-center px-3.5 py-1.5 rounded-full bg-primary-dark hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Concluir sessão
            </button>
          )}

          {/* Botão compacto de Pausar / Continuar (ícone apenas, sem texto - RF21) */}
          {isEmAndamento && (
            <button
              type="button"
              onClick={handleTogglePausa}
              title={isSessaoPausada ? "Continuar sessão" : "Pausar sessão"}
              aria-label={isSessaoPausada ? "Continuar sessão" : "Pausar sessão"}
              data-testid="btn-toggle-pausa"
              className={`flex items-center justify-center h-8 w-8 rounded-full border transition-colors cursor-pointer shrink-0 ${
                isSessaoPausada
                  ? "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300 shadow-2xs"
                  : "bg-surface hover:bg-slate-100 border-border text-muted-foreground hover:text-foreground dark:hover:bg-muted shadow-2xs"
              }`}
            >
              {isSessaoPausada ? (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              ) : (
                <Pause className="h-4 w-4 fill-current" />
              )}
            </button>
          )}
        </div>

        {/* ATALHO PARA COCKPIT SOMENTE para sessões ativas (em andamento ou em pausa) */}
        {isEmAndamento && (
          <button
            type="button"
            onClick={handleAcessarCockpit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white dark:bg-muted text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>Cockpit</span>
          </button>
        )}

        {/* ATALHO PARA RELATÓRIO para sessões finalizadas */}
        {isFinalizada && (
          <button
            type="button"
            onClick={handleVerRelatorio}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Ver Relatório</span>
          </button>
        )}
      </div>

      {/* 3. SEÇÃO STATUS (Figma: 'Status') */}
      <div className="flex items-center justify-end">
        {isSessaoPausada ? (
          <div
            data-testid="badge-sessao-pausada"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-semibold"
          >
            <span>Em Pausa</span>
          </div>
        ) : isEmAndamento ? (
          <div
            data-testid="badge-sessao-andamento"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-semibold"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Em Andamento</span>
          </div>
        ) : isFinalizada ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
            <span>Finalizado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
            <XCircle className="h-3.5 w-3.5" />
            <span className="capitalize">{status}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const SessionTimerCard = CardSessaoTimer;
export default CardSessaoTimer;
