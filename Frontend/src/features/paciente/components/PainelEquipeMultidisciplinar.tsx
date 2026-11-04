/**
 * ============================================================================
 * COMPONENTE: PAINEL DA EQUIPE MULTIDISCIPLINAR DO PACIENTE
 * Conformidade: RF18, RN04, RNF07 (Alvos de toque >= 44px), Seção 7.7 do PDF
 * Nomenclatura clínica obrigatória: "Equipe Multidisciplinar" / "Especialistas Vinculados"
 * ============================================================================
 */

import React from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Stethoscope,
  AlertCircle,
  RefreshCw,
  Loader2,
  Award,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { EspecialistaVinculado } from "../types/paciente.types";

export type EspecialistaEquipeItem = EspecialistaVinculado;

export interface PainelEquipeMultidisciplinarProps {
  /** Lista de especialistas vinculados à equipe multidisciplinar do paciente */
  especialistas: EspecialistaVinculado[];
  /** ID do especialista autenticado na sessão atual para destaque "Você (Logado)" */
  usuarioLogadoId?: string | null;
  /** Estado de carregamento assíncrono (Skeleton Loader) */
  loading?: boolean;
  /** Mensagem de erro caso a busca de vínculos falhe */
  erro?: string | null;
  /** ID do especialista que está sendo desvinculado no momento (trava de clique duplo) */
  removendoId?: string | null;
  /** Callback para abrir o modal de vinculação de especialista da clínica */
  onAbrirModalVincular?: () => void;
  /** Callback disparada ao solicitar desvinculação de um especialista */
  onDesvincularEspecialista?: (terapeutaId: string) => void | Promise<void>;
  /** Callback opcional de retentativa em caso de erro de rede */
  onRetry?: () => void;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Extrai até duas iniciais do nome do especialista para exibição no avatar circular.
 */
function extrairIniciaisEspecialista(nome: string): string {
  const limpo = nome
    .replace(/^(Dr\.|Dra\.|Prof\.|Profa\.)\s+/i, "")
    .trim();
  const partes = limpo.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "ES";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export const PainelEquipeMultidisciplinar: React.FC<
  PainelEquipeMultidisciplinarProps
> = ({
  especialistas,
  usuarioLogadoId,
  loading = false,
  erro = null,
  removendoId = null,
  onAbrirModalVincular,
  onDesvincularEspecialista,
  onRetry,
  className = "",
}) => {
  const isUnicoEspecialista = especialistas.length <= 1;

  return (
    <section
      aria-label="Equipe Multidisciplinar (Especialistas Vinculados)"
      data-testid="painel-equipe-multidisciplinar"
      className={`bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 ${className}`.trim()}
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">
                Equipe Multidisciplinar (Especialistas Vinculados)
              </h2>
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs px-2.5 py-0.5 rounded-full">
                {especialistas.length}{" "}
                {especialistas.length === 1 ? "especialista" : "especialistas"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Profissionais da clínica com acesso compartilhado ao prontuário,
              histórico longitudinal e condução de sessões terapêuticas (RN04).
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => onAbrirModalVincular?.()}
          data-testid="btn-adicionar-especialista"
          className="min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Especialista
        </Button>
      </div>

      {/* 1. Estado de Carregamento (Skeleton Loader) */}
      {loading && (
        <div
          role="status"
          aria-busy="true"
          data-testid="painel-equipe-skeleton"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {[1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 animate-pulse"
            >
              <div className="flex items-center gap-3.5 flex-1">
                <Skeleton className="w-12 h-12 rounded-2xl shrink-0 bg-muted" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-44 rounded-md bg-muted" />
                  <Skeleton className="h-3.5 w-32 rounded-md bg-muted" />
                </div>
              </div>
              <Skeleton className="h-11 w-28 rounded-xl shrink-0 bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* 2. Estado de Erro */}
      {!loading && erro && (
        <div
          role="alert"
          data-testid="painel-equipe-error"
          className="rounded-2xl border border-red-200 bg-red-50/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">
                Não foi possível carregar os Especialistas Vinculados
              </p>
              <p className="text-xs font-medium text-red-700 mt-0.5">{erro}</p>
            </div>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              data-testid="btn-retentar-equipe"
              className="min-h-11 border-red-200 bg-white text-red-700 hover:bg-red-50 font-bold rounded-xl px-4 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </div>
      )}

      {/* 3. Estado Vazio (Empty State) */}
      {!loading && !erro && especialistas.length === 0 && (
        <div
          data-testid="painel-equipe-empty"
          className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-8 text-center"
        >
          <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
          <p className="text-sm font-bold text-gray-700">
            Nenhum especialista vinculado a este prontuário no momento.
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Adicione profissionais da clínica (Terapia Ocupacional, Psicologia,
            Fonoaudiologia, Psicopedagogia) para compor a Equipe
            Multidisciplinar do paciente.
          </p>
        </div>
      )}

      {/* 4. Estado de Sucesso (Lista de Cards de Especialistas) */}
      {!loading && !erro && especialistas.length > 0 && (
        <div
          data-testid="painel-equipe-lista"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {especialistas.map((esp) => {
            const isUsuarioLogado =
              Boolean(usuarioLogadoId) && esp.id === usuarioLogadoId;
            const registroExibicao =
              esp.registro_profissional ||
              esp.crefito ||
              esp.crp ||
              "Registro institucional ativo";
            const especialidadeExibicao =
              esp.especialidade || "Equipe Multidisciplinar";
            const isRemovendoEste = removendoId === esp.id;
            const desabilitado = isUnicoEspecialista || Boolean(removendoId);

            return (
              <div
                key={esp.id}
                data-testid={`card-especialista-${esp.id}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  isUsuarioLogado
                    ? "border-indigo-200 bg-indigo-50/40"
                    : "border-gray-100 bg-gray-50/60 hover:border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                      isUsuarioLogado
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-indigo-700"
                    }`}
                  >
                    {extrairIniciaisEspecialista(esp.nome)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-sm truncate">
                        {esp.nome}
                      </span>
                      {isUsuarioLogado && (
                        <Badge
                          data-testid="badge-voce-logado"
                          className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Você (Logado)
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-indigo-700 mt-1 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{especialidadeExibicao}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500 font-medium">
                      <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-gray-200 text-gray-600 font-mono text-[11px]">
                        <Award className="w-3 h-3 text-gray-400" />
                        {registroExibicao}
                      </span>
                      {esp.email && (
                        <span className="truncate text-gray-400">
                          {esp.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botão de Desvincular (protegido contra remoção do último especialista) */}
                <div className="flex items-center justify-end shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={desabilitado}
                    title={
                      isUnicoEspecialista
                        ? "O paciente deve possuir ao menos 1 especialista vinculado (Regra Anti-Órfão RN04)"
                        : `Remover vínculo de ${esp.nome}`
                    }
                    aria-label={`Desvincular ${esp.nome}`}
                    onClick={() => {
                      if (!desabilitado) {
                        onDesvincularEspecialista?.(esp.id);
                      }
                    }}
                    data-testid={`btn-desvincular-${esp.id}`}
                    className={`min-h-11 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                      isUnicoEspecialista
                        ? "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed opacity-70"
                        : "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white"
                    }`}
                  >
                    {isRemovendoEste ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                    <span>{isRemovendoEste ? "Removendo..." : "Desvincular"}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PainelEquipeMultidisciplinar;
