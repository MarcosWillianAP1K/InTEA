import { useNavigate } from "react-router-dom";
import { Gamepad2, Clock, CheckCircle2, Activity } from "lucide-react";

/**
 * ============================================================================
 * COMPONENTE CARD SESSÃO COM TIMER (InTEA)
 * Figma: 'sessão - InTEA' (Node ID: '61:759')
 * Conformidade: RF12 (Cockpit da Sessão), RF13 (Finalização da Sessão)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface CardSessaoTimerProps {
  sessaoId?: string;
  pacienteNome?: string;
  jogoTitulo?: string;
  tempoFormatado?: string;
  duracaoSegundos?: number;
  status?: "conectado" | "em_andamento" | "pausado" | "finalizada" | "aguardando_pareamento" | string;
  onCockpitClick?: () => void;
  onConcluirClick?: () => void;
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
  status = "conectado",
  onCockpitClick,
  onConcluirClick,
  className = "",
  "data-testid": testId,
}: CardSessaoTimerProps) {
  const navigate = useNavigate();

  const tempoExibido = tempoFormatado ?? formatarSegundos(duracaoSegundos);

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

  const isEmAndamento = status === "em_andamento" || status === "conectado";
  const isFinalizada = status === "finalizada";

  return (
    <div
      data-testid={testId || (sessaoId ? `sessao-card-${sessaoId}` : "card-sessao-timer")}
      className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-8 px-5 py-4 rounded-xl bg-[#FEFCFF] dark:bg-card border border-[#DCE9FF] dark:border-border shadow-xs hover:shadow-sm transition-all ${className}`}
    >
      {/* 1. SEÇÃO ATIVIDADE (Figma: 'Atividade') */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center rounded-lg bg-[#E5EEFF] dark:bg-blue-950/60 p-2.5 text-[#1E40AF] dark:text-blue-400 shrink-0">
          <Gamepad2 className="h-6 w-6 stroke-[2]" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-2xs font-medium text-[#444653] dark:text-muted-foreground truncate">
            {pacienteNome}
          </span>
          <span className="text-base sm:text-lg font-semibold text-[#1E40AF] dark:text-blue-300 truncate">
            Atividade atual: {jogoTitulo}
          </span>
        </div>
      </div>

      {/* 2. SEÇÃO COUNTDOWN TIMER & AÇÃO (Figma: 'Countdown timer') */}
      <div className="flex flex-wrap items-center justify-between md:justify-center gap-3">
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#E5EEFF] dark:bg-blue-950/40">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#00288E] dark:text-blue-300 shrink-0" />
            <span
              data-testid="countdown-display"
              className="font-mono text-xl sm:text-2xl font-bold text-[#00288E] dark:text-blue-300 tracking-tight"
            >
              {tempoExibido}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConcluir}
            className="flex items-center justify-center px-3.5 py-2 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Concluir sessão
          </button>
        </div>

        {/* ATALHO PARA COCKPIT */}
        <button
          type="button"
          onClick={handleAcessarCockpit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white dark:bg-muted text-foreground hover:bg-slate-50 dark:hover:bg-muted/80 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Activity className="h-3.5 w-3.5 text-[#0b3294] dark:text-blue-400" />
          <span>Cockpit</span>
        </button>
      </div>

      {/* 3. SEÇÃO STATUS (Figma: 'Status') */}
      <div className="flex items-center justify-end">
        {isFinalizada ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
            <span>Finalizado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6FFBBE] text-[#002113] text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#003D27] animate-pulse" />
            <span>{isEmAndamento ? "Conectado" : status}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const SessionTimerCard = CardSessaoTimer;
export default CardSessaoTimer;
