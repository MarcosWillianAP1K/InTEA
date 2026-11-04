import React from "react";
import { UserPlus, UserCheck, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export interface EspecialistaEquipeItem {
  id: string;
  nome: string;
  especialidade?: string | null;
  registro_profissional?: string | null;
  conselho?: string | null;
  crefito?: string | null;
  crp?: string | null;
  email?: string | null;
}

export interface PainelEquipeMultidisciplinarProps {
  especialistas: EspecialistaEquipeItem[];
  usuarioLogadoId?: string | null;
  loading?: boolean;
  erro?: string | null;
  removendoId?: string | null;
  onAbrirModalVincular?: () => void;
  onDesvincularEspecialista?: (terapeutaId: string) => void;
  onRetry?: () => void;
  className?: string;
}

function extrairIniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => !/^(dr|dra|dr\.|dra\.)$/i.test(parte));
  if (partes.length === 0) return "ES";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function resolverRegistroProfissional(
  especialista: EspecialistaEquipeItem,
): string | null {
  return (
    especialista.registro_profissional?.trim() ||
    especialista.conselho?.trim() ||
    especialista.crefito?.trim() ||
    especialista.crp?.trim() ||
    null
  );
}

/**
 * Painel de Equipe Multidisciplinar (RF18, RF21, RN04).
 * Exibe os especialistas da clínica vinculados ao prontuário do paciente
 * e fornece controles para associação e desvinculação segura (Anti-Órfão).
 */
export function PainelEquipeMultidisciplinar({
  especialistas,
  usuarioLogadoId,
  loading = false,
  erro = null,
  removendoId = null,
  onAbrirModalVincular,
  onDesvincularEspecialista,
  onRetry,
  className = "",
}: PainelEquipeMultidisciplinarProps) {
  const bloqueioUltimoEspecialista = especialistas.length <= 1;

  return (
    <section
      aria-label="Equipe Multidisciplinar (Especialistas Vinculados)"
      data-testid="painel-equipe-multidisciplinar"
      className={`rounded-xl border border-border bg-card p-5 shadow-xs ${className}`.trim()}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">
              Equipe Multidisciplinar (Especialistas Vinculados)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Profissionais da clínica com acesso compartilhado ao prontuário clínico (RF18, RN04)
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => onAbrirModalVincular?.()}
          data-testid="btn-adicionar-especialista"
          className="min-h-11 min-w-11 gap-1.5 text-xs font-semibold"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Adicionar Especialista</span>
        </Button>
      </div>

      {loading ? (
        <div
          role="status"
          aria-busy="true"
          data-testid="painel-equipe-skeleton"
          className="space-y-3"
        >
          <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      ) : erro ? (
        <div
          role="alert"
          data-testid="painel-equipe-error"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="min-h-11 min-w-11 text-xs"
            >
              Tentar novamente
            </Button>
          )}
        </div>
      ) : especialistas.length === 0 ? (
        <div
          data-testid="painel-equipe-empty"
          className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground"
        >
          Nenhum especialista vinculado a este prontuário no momento.
        </div>
      ) : (
        <ul data-testid="painel-equipe-lista" className="space-y-2.5">
          {especialistas.map((esp) => {
            const ehUsuarioLogado = Boolean(
              usuarioLogadoId && esp.id === usuarioLogadoId,
            );
            const estaRemovendo = removendoId === esp.id;
            const desabilitado = bloqueioUltimoEspecialista || Boolean(removendoId);
            const registro = resolverRegistroProfissional(esp);

            return (
              <li
                key={esp.id}
                data-testid={`especialista-card-${esp.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 p-3 hover:bg-muted/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                  >
                    {extrairIniciais(esp.nome)}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground wrap-break-word">
                        {esp.nome}
                      </span>
                      {ehUsuarioLogado && (
                        <span
                          data-testid="badge-voce-logado"
                          className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          Você (Logado)
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {esp.especialidade && <span>{esp.especialidade}</span>}
                      {registro && <span>• {registro}</span>}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={desabilitado}
                  title={
                    bloqueioUltimoEspecialista
                      ? "O paciente deve possuir ao menos 1 especialista vinculado (Regra Anti-Órfão RN04)"
                      : "Desvincular especialista da equipe clínica"
                  }
                  aria-label={`Desvincular ${esp.nome}`}
                  onClick={() => {
                    if (!desabilitado) {
                      onDesvincularEspecialista?.(esp.id);
                    }
                  }}
                  data-testid={`btn-desvincular-${esp.id}`}
                  className="min-h-11 min-w-11 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{estaRemovendo ? "Removendo..." : "Desvincular"}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default PainelEquipeMultidisciplinar;
