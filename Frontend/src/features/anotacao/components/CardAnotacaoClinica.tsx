import { useState } from "react";
import type { AnotacaoClinica } from "../types/anotacao.types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  User,
  Clock,
  Edit3,
  Trash2,
  Save,
  X,
  AlertTriangle,
  FileText,
  Activity,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export interface CardAnotacaoClinicaProps {
  anotacao: AnotacaoClinica;
  usuarioLogadoId?: string;
  podeEditar?: boolean;
  onAtualizar?: (id: string, novoConteudo: string) => Promise<void> | void;
  onInativar?: (id: string) => Promise<void> | void;
  onReativar?: (id: string) => Promise<void> | void;
  isSubmitting?: boolean;
  className?: string;
}

/**
 * Formata timestamp ISO para o padrão brasileiro legível.
 */
function formatarDataHora(isoString?: string): string {
  if (!isoString) return "Data não informada";
  try {
    const data = new Date(isoString);
    if (isNaN(data.getTime())) return isoString;
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * ============================================================================
 * COMPONENTE: CardAnotacaoClinica
 * Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria Indelével),
 *              RN04 (Vínculo Clínico), RN05 (Inalterabilidade / Soft Delete),
 *              RNF07 (Acessibilidade e Alvos de Toque >= 44x44px)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */
export function CardAnotacaoClinica({
  anotacao,
  usuarioLogadoId,
  podeEditar,
  onAtualizar,
  onInativar,
  isSubmitting = false,
  className = "",
}: CardAnotacaoClinicaProps) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState(anotacao.conteudo);
  const [confirmandoInativar, setConfirmandoInativar] = useState(false);
  const [salvandoLocal, setSalvandoLocal] = useState(false);

  // Verificação estrita de autor (RF21) ou override por prop
  const ehAutor = Boolean(
    usuarioLogadoId && anotacao.terapeuta_id === usuarioLogadoId,
  );
  const temPermissaoEdicao = Boolean(podeEditar ?? ehAutor);

  const isInativa = anotacao.soft_delete === true || anotacao.status_ativo === false;
  const ocupado = isSubmitting || salvandoLocal;

  // Extração de autoria com prioridade absoluta aos metadados completos (RF21)
  const autorNome =
    anotacao.autor?.nome || anotacao.terapeuta_nome || "Terapeuta Responsável";
  const conselho =
    anotacao.autor?.registro_profissional || anotacao.autor?.crefito || null;
  const especialidade = anotacao.autor?.especialidade || null;

  const limiteCaracteres = 2000;

  async function handleSalvarEdicao() {
    if (ocupado || !textoEdicao.trim() || !onAtualizar) return;
    try {
      setSalvandoLocal(true);
      await onAtualizar(anotacao.id, textoEdicao.trim());
      setModoEdicao(false);
    } finally {
      setSalvandoLocal(false);
    }
  }

  function handleCancelarEdicao() {
    setTextoEdicao(anotacao.conteudo);
    setModoEdicao(false);
  }

  async function handleConfirmarInativacao() {
    if (ocupado || !onInativar) return;
    try {
      setSalvandoLocal(true);
      await onInativar(anotacao.id);
      setConfirmandoInativar(false);
    } finally {
      setSalvandoLocal(false);
    }
  }

  return (
    <article
      data-testid={`card-anotacao-${anotacao.id}`}
      className={`rounded-2xl border p-5 transition-all shadow-sm ${
        isInativa
          ? "border-destructive/30 bg-destructive/5 opacity-75"
          : "border-border bg-card text-card-foreground hover:border-primary/30 hover:shadow-md"
      } ${className}`}
    >
      {/* Cabeçalho de Autoria Indelével (RF21) */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${
              isInativa
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
            aria-hidden="true"
          >
            <User className="h-5 w-5" />
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                data-testid="autor-nome"
                className="font-bold text-sm text-foreground tracking-tight"
              >
                {autorNome}
              </span>
              <span
                title="Autoria profissional verificada"
                className="inline-flex items-center"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {conselho && (
                <span
                  data-testid="autor-conselho"
                  className="font-semibold text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded"
                >
                  {conselho}
                </span>
              )}
              {especialidade && (
                <span
                  data-testid="autor-especialidade"
                  className="italic"
                >
                  {especialidade}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badges de Vínculo e Status */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isInativa ? (
            <Badge variant="destructive" data-testid="badge-inativa">
              Inativa (Soft Delete)
            </Badge>
          ) : anotacao.sessao_id ? (
            <a
              href={`/sessao/${encodeURIComponent(anotacao.sessao_id)}/resultado`}
              className="inline-flex items-center gap-1"
              title="Acessar tela de resultados desta sessão"
            >
              <Badge
                variant="secondary"
                data-testid="badge-sessao"
                className="hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Activity className="h-3 w-3 mr-1 text-primary" />
                Sessão Clínica
                <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
              </Badge>
            </a>
          ) : (
            <Badge variant="outline" data-testid="badge-prontuario">
              <FileText className="h-3 w-3 mr-1 text-muted-foreground" />
              Prontuário Geral
            </Badge>
          )}

          {/* Carimbo de data/hora */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
            <Clock className="h-3.5 w-3.5" />
            <time dateTime={anotacao.created_at}>
              {formatarDataHora(anotacao.created_at)}
            </time>
          </div>
        </div>
      </header>

      {/* Conteúdo Clínico */}
      <div className="py-3.5">
        {modoEdicao ? (
          <div className="flex flex-col gap-2" data-testid="container-edicao-inline">
            <label
              htmlFor={`edicao-texto-${anotacao.id}`}
              className="text-xs font-semibold text-foreground"
            >
              Editar anotação clínica:
            </label>
            <textarea
              id={`edicao-texto-${anotacao.id}`}
              data-testid="textarea-edicao"
              value={textoEdicao}
              onChange={(e) => setTextoEdicao(e.target.value)}
              maxLength={limiteCaracteres}
              rows={4}
              disabled={ocupado}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Máximo {limiteCaracteres} caracteres</span>
              <span>
                {textoEdicao.length}/{limiteCaracteres}
              </span>
            </div>

            {/* Ações de Edição */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelarEdicao}
                disabled={ocupado}
                className="min-h-11 min-w-11 px-3 cursor-pointer"
                data-testid="botao-cancelar-edicao"
              >
                <X className="h-4 w-4 mr-1.5" />
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSalvarEdicao}
                disabled={ocupado || !textoEdicao.trim()}
                className="min-h-11 min-w-11 px-4 cursor-pointer"
                data-testid="botao-salvar-edicao"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {salvandoLocal ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        ) : (
          <p
            data-testid="conteudo-anotacao"
            className="text-sm leading-relaxed text-foreground whitespace-pre-wrap wrap-break-word"
          >
            {anotacao.conteudo}
          </p>
        )}
      </div>

      {/* Confirmação de Inativação Lógica (RN05) */}
      {confirmandoInativar && (
        <div
          data-testid="alerta-confirmar-inativacao"
          className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Deseja realmente inativar esta anotação? O registro será arquivado no histórico clínico.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmandoInativar(false)}
              disabled={ocupado}
              className="min-h-11 min-w-11 px-3 text-xs cursor-pointer"
              data-testid="botao-cancelar-inativacao"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmarInativacao}
              disabled={ocupado}
              className="min-h-11 min-w-11 px-3 text-xs cursor-pointer"
              data-testid="botao-confirmar-inativacao"
            >
              {salvandoLocal ? "Inativando..." : "Confirmar Inativação"}
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Ações do Autor (RF21, RN05, RNF07) */}
      {!modoEdicao && !confirmandoInativar && temPermissaoEdicao && !isInativa && (
        <footer className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setModoEdicao(true)}
            disabled={ocupado}
            className="min-h-11 min-w-11 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            data-testid="botao-editar-anotacao"
            title="Editar conteúdo desta anotação"
          >
            <Edit3 className="h-4 w-4 mr-1.5" />
            Editar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmandoInativar(true)}
            disabled={ocupado}
            className="min-h-11 min-w-11 px-3 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
            data-testid="botao-inativar-anotacao"
            title="Inativar anotação clínica (Soft Delete)"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Inativar
          </Button>
        </footer>
      )}
    </article>
  );
}

export default CardAnotacaoClinica;
