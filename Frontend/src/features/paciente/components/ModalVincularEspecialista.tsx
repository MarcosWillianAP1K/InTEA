/**
 * ============================================================================
 * COMPONENTE: MODAL DE VINCULAÇÃO DE ESPECIALISTA DA CLÍNICA AO PACIENTE
 * Conformidade: RF18, RF19, RN04, RNF07 (Alvos de toque >= 44px)
 * Nomenclatura clínica obrigatória: "Equipe Multidisciplinar" / "Especialistas Vinculados"
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Search,
  UserPlus,
  CheckCircle2,
  Stethoscope,
  AlertCircle,
  Loader2,
  Award,
} from "lucide-react";

export interface EspecialistaClinicaItem {
  id: string;
  nome: string;
  email?: string | null;
  crefito?: string | null;
  crp?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  status_ativo?: boolean;
}

export interface ModalVincularEspecialistaProps {
  /** Controla se o modal está aberto */
  isOpen: boolean;
  /** Callback para fechar o modal */
  onClose: () => void;
  /** Lista de terapeutas/especialistas ativos na mesma clínica (RN04) */
  terapeutasDisponiveis?: EspecialistaClinicaItem[];
  /** Alias alternativo para a lista de terapeutas da clínica (compatibilidade com testes unitários) */
  terapeutasClinica?: EspecialistaClinicaItem[];
  /** Lista de IDs de especialistas que já pertencem à equipe multidisciplinar do paciente */
  idsJaVinculados: string[];
  /** Callback disparada ao confirmar o vínculo do especialista selecionado */
  onConfirmarVinculo: (terapeutaId: string) => void | Promise<void>;
  /** Estado de submissão em andamento (trava de clique duplo) */
  isSubmitting?: boolean;
  /** Mensagem de erro semântico (ex: 403 clínica divergente ou 409 vínculo duplicado) */
  erro?: string | null;
  /** Alias alternativo para mensagem de erro no modal */
  erroModal?: string | null;
  /** Nome opcional do paciente para contextualização no cabeçalho */
  pacienteNome?: string;
}

export const ModalVincularEspecialista: React.FC<
  ModalVincularEspecialistaProps
> = ({
  isOpen,
  onClose,
  terapeutasDisponiveis,
  terapeutasClinica,
  idsJaVinculados,
  onConfirmarVinculo,
  isSubmitting = false,
  erro = null,
  erroModal = null,
  pacienteNome,
}) => {
  const [termoBusca, setTermoBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const listaProfissionais = useMemo(
    () => terapeutasDisponiveis ?? terapeutasClinica ?? [],
    [terapeutasDisponiveis, terapeutasClinica],
  );
  const mensagemErro = erro ?? erroModal ?? null;

  useEffect(() => {
    if (!isOpen) {
      setTermoBusca("");
      setSelecionadoId(null);
    }
  }, [isOpen]);

  const especialistasFiltrados = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();
    const ativos = listaProfissionais.filter(
      (t) => t.status_ativo !== false,
    );

    if (!termo) return ativos;

    return ativos.filter((t) => {
      const nome = (t.nome || "").toLowerCase();
      const especialidade = (t.especialidade || "").toLowerCase();
      const crefito = (t.crefito || "").toLowerCase();
      const crp = (t.crp || "").toLowerCase();
      const registro = (t.registro_profissional || "").toLowerCase();
      const email = (t.email || "").toLowerCase();

      return (
        nome.includes(termo) ||
        especialidade.includes(termo) ||
        crefito.includes(termo) ||
        crp.includes(termo) ||
        registro.includes(termo) ||
        email.includes(termo)
      );
    });
  }, [listaProfissionais, termoBusca]);

  const handleConfirmar = async () => {
    if (!selecionadoId || isSubmitting) return;
    await onConfirmarVinculo(selecionadoId);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(aberto) => {
        if (!aberto && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-testid="modal-vincular-especialista"
        className="sm:max-w-xl rounded-3xl p-6 lg:p-8 bg-white border border-gray-100 shadow-xl"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-gray-900">
                Vincular Especialista à Equipe Multidisciplinar
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-gray-500 mt-0.5">
                {pacienteNome
                  ? `Selecione um profissional da clínica para compartilhar o acompanhamento de ${pacienteNome} (RF18, RN04).`
                  : "Selecione um profissional da clínica para integrar a Equipe Multidisciplinar do paciente (RF18, RN04)."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alerta de erro semântico (403 / 409) */}
        {mensagemErro && (
          <div
            role="alert"
            data-testid="alerta-erro-modal-vinculo"
            className="rounded-2xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-red-800 text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* Campo de busca instantânea (RF19) */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome, especialidade ou conselho (CREFITO/CRP)..."
            aria-label="Buscar especialista da clínica"
            data-testid="input-busca-especialista"
            className="w-full min-h-11 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/70 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Lista de Especialistas da Clínica */}
        <div
          data-testid="lista-especialistas-disponiveis"
          className="max-h-72 overflow-y-auto space-y-2.5 pr-1 my-2"
        >
          {especialistasFiltrados.length === 0 ? (
            <div
              data-testid="busca-especialista-vazia"
              className="py-8 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50"
            >
              <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600">
                Nenhum especialista encontrado na clínica
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Verifique o termo pesquisado no filtro acima.
              </p>
            </div>
          ) : (
            especialistasFiltrados.map((terapeuta) => {
              const jaVinculado = idsJaVinculados.includes(terapeuta.id);
              const isSelecionado = selecionadoId === terapeuta.id;
              const registro =
                terapeuta.registro_profissional ||
                terapeuta.crefito ||
                terapeuta.crp ||
                "Registro ativo";

              return (
                <button
                  key={terapeuta.id}
                  type="button"
                  disabled={jaVinculado || isSubmitting}
                  onClick={() => setSelecionadoId(terapeuta.id)}
                  data-testid={`opcao-especialista-${terapeuta.id}`}
                  className={`w-full min-h-14 text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    jaVinculado
                      ? "border-gray-100 bg-gray-50 opacity-65 cursor-not-allowed"
                      : isSelecionado
                        ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20"
                        : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-gray-900">
                        {terapeuta.nome}
                      </span>
                      {jaVinculado && (
                        <Badge
                          data-testid={`badge-ja-vinculado-${terapeuta.id}`}
                          className="bg-gray-200 text-gray-700 border-none text-[11px] font-bold px-2 py-0.5 rounded-full"
                        >
                          Já faz parte da equipe
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
                      <span className="text-indigo-700 font-semibold flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5" />
                        {terapeuta.especialidade || "Equipe Multidisciplinar"}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-600">
                        <Award className="w-3 h-3 text-gray-400" />
                        {registro}
                      </span>
                    </div>
                  </div>

                  {!jaVinculado && (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isSelecionado
                          ? "bg-indigo-600 text-white"
                          : "border-2 border-gray-300 bg-white"
                      }`}
                    >
                      {isSelecionado && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            data-testid="btn-cancelar-vinculo"
            className="min-h-11 px-5 rounded-xl font-bold border-gray-200 text-gray-700"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selecionadoId || isSubmitting}
            onClick={handleConfirmar}
            data-testid="btn-confirmar-vinculo"
            className="min-h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Confirmar Vínculo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalVincularEspecialista;
