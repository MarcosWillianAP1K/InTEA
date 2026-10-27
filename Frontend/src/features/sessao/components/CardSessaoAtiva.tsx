import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Gamepad2, Clock, FileText, Activity } from "lucide-react";
import { useClinicalTimer } from "../hooks/useClinicalTimer";
import { useSessionStore } from "../store/sessionStore";

/**
 * ============================================================================
 * COMPONENTE: CardSessaoAtiva (Sessão Ativa com Botão de Anotação Rápida e Timer Sincronizado)
 * Conformidade: RF12 (Cockpit da Sessão), RF16 (Anotações Clínicas),
 *              RF21 (Pausa e Retomada), RN01 (Modo Livre Sem Prontuário)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface CardSessaoAtivaProps {
  sessaoId: string;
  pacienteNome?: string;
  pacienteId?: string | null;
  jogoTitulo: string;
  tempoFormatado?: string;
  dataHoraInicio?: string;
  status?: string;
  isPausado?: boolean;
  isModoLivre?: boolean;
  onAbrirAnotacoes?: () => void;
  onAcessarCockpit?: () => void;
  className?: string;
}

export function CardSessaoAtiva({
  sessaoId,
  pacienteNome = "Paciente em Atendimento",
  pacienteId,
  jogoTitulo,
  tempoFormatado: tempoFormatadoProp,
  dataHoraInicio,
  status = "em_andamento",
  isPausado: isPausadoProp,
  isModoLivre = false,
  onAbrirAnotacoes,
  onAcessarCockpit,
  className = "",
}: CardSessaoAtivaProps) {
  const modoLivreEfetivo = isModoLivre || !pacienteId;

  const storeIsPausado = useSessionStore((state) => state.isPausado);
  const storeSessaoId = useSessionStore((state) => state.sessaoId || state.pareamento?.sessionToken);

  const isMesmaSessao = !sessaoId || !storeSessaoId || sessaoId === storeSessaoId;
  const isPausado = Boolean(
    isPausadoProp ?? (status === "pausada" || (isMesmaSessao && storeIsPausado))
  );

  const isAtivo = status === "em_andamento" || status === "conectado" || status === "pausada";

  const timer = useClinicalTimer({
    sessaoId: sessaoId || "sessao-ativa",
    ativo: isAtivo,
    isPausado,
    dataHoraInicioInicial: dataHoraInicio,
  });

  const tempoExibido = tempoFormatadoProp || timer.tempoFormatado;

  return (
    <div
      data-testid="card-sessao-ativa"
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs transition-all ${className}`}
    >
      {/* 1. Identificação do Jogo e do Paciente */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex items-center justify-center rounded-xl bg-primary/10 text-primary p-3 shrink-0">
          <Gamepad2 className="h-6 w-6 stroke-2" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span
              data-testid="card-paciente-nome"
              className="text-sm font-bold text-foreground truncate"
            >
              {modoLivreEfetivo ? "Modo Livre (Sem Prontuário)" : pacienteNome}
            </span>
            {modoLivreEfetivo ? (
              <Badge
                variant="outline"
                className="text-2xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300"
              >
                Modo Livre
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-2xs bg-primary/10 text-primary border-primary/20"
              >
                Prontuário Ativo
              </Badge>
            )}
          </div>

          <span
            data-testid="card-jogo-titulo"
            className="text-xs text-muted-foreground truncate"
          >
            {jogoTitulo} • <span className="font-mono text-2xs">ID: {sessaoId}</span>
          </span>
        </div>
      </div>

      {/* 2. Cronômetro e Status Sincronizados com o Cockpit */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border">
          <Clock
            className={`h-4 w-4 ${
              isPausado
                ? "text-amber-500"
                : isAtivo
                  ? "text-amber-500 animate-pulse"
                  : "text-primary"
            }`}
          />
          <span
            data-testid="card-sessao-ativa-tempo"
            className="font-mono text-sm font-bold text-foreground"
          >
            {tempoExibido}
          </span>
        </div>

        <Badge
          data-testid="card-sessao-status-badge"
          variant="outline"
          className={`text-2xs font-semibold px-2.5 py-1 ${
            isPausado
              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              : status === "em_andamento" || status === "conectado"
                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {isPausado ? "Em Pausa" : status === "em_andamento" || status === "conectado" ? "Em Andamento" : status}
        </Badge>
      </div>

      {/* 3. Ações Rápidas: Botão de Anotações Clínicas e Cockpit */}
      <div className="flex items-center gap-2">
        {onAcessarCockpit && (
          <Button
            type="button"
            data-testid="botao-acessar-cockpit-card"
            variant="outline"
            size="sm"
            onClick={onAcessarCockpit}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-xl min-h-11 px-3.5"
          >
            <Activity className="h-4 w-4 text-primary" />
            <span>Cockpit</span>
          </Button>
        )}

        <Button
          type="button"
          data-testid="botao-abrir-anotacoes-card"
          variant="default"
          size="sm"
          disabled={modoLivreEfetivo}
          onClick={onAbrirAnotacoes}
          title={
            modoLivreEfetivo
              ? "Partidas em Modo Livre não registram anotações no prontuário (RN01)"
              : "Registrar anotação clínica na sessão ativa"
          }
          className="flex items-center gap-2 text-xs font-semibold rounded-xl min-h-11 min-w-11 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="h-4 w-4" />
          <span>Anotar</span>
        </Button>
      </div>
    </div>
  );
}

export default CardSessaoAtiva;
