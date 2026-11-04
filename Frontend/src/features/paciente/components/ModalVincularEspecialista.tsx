import React, { useState } from "react";
import type { EspecialistaEquipeItem } from "./PainelEquipeMultidisciplinar";

export interface ModalVincularEspecialistaProps {
  isOpen: boolean;
  onClose: () => void;
  terapeutasDisponiveis?: EspecialistaEquipeItem[];
  terapeutasClinica?: EspecialistaEquipeItem[];
  idsJaVinculados: string[];
  onConfirmarVinculo: (terapeutaId: string) => void | Promise<void>;
  isSubmitting?: boolean;
  erro?: string | null;
  erroModal?: string | null;
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
 * Modal para vinculação de especialista da clínica à equipe multidisciplinar do paciente (RF18, RN04).
 */
export function ModalVincularEspecialista({
  isOpen,
  onClose,
  terapeutasDisponiveis,
  terapeutasClinica,
  idsJaVinculados,
  onConfirmarVinculo,
  isSubmitting = false,
  erro = null,
  erroModal = null,
}: ModalVincularEspecialistaProps) {
  const [termoBusca, setTermoBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string>("");

  if (!isOpen) return null;

  const listaBase = terapeutasDisponiveis ?? terapeutasClinica ?? [];
  const mensagemErro = erro ?? erroModal;
  const termoNormalizado = termoBusca.trim().toLowerCase();

  const terapeutasFiltrados = listaBase.filter((terapeuta) => {
    if (!termoNormalizado) return true;
    const registro = resolverRegistroProfissional(terapeuta) ?? "";
    const alvo = `${terapeuta.nome} ${terapeuta.especialidade ?? ""} ${registro}`.toLowerCase();
    return alvo.includes(termoNormalizado);
  });

  const confirmarDesabilitado =
    isSubmitting ||
    !selecionadoId ||
    idsJaVinculados.includes(selecionadoId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vincular Especialista à Equipe Multidisciplinar"
      data-testid="modal-vincular-especialista"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Vincular Especialista da Clínica
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="busca-especialista-input"
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Buscar especialista
          </label>
          <input
            id="busca-especialista-input"
            type="search"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome, especialidade ou registro (CREFITO/CRP)..."
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {mensagemErro && (
          <div
            role="alert"
            data-testid="modal-vincular-erro"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {mensagemErro}
          </div>
        )}

        <ul className="mb-4 max-h-60 space-y-2 overflow-y-auto">
          {terapeutasFiltrados.map((terapeuta) => {
            const jaVinculado = idsJaVinculados.includes(terapeuta.id);
            const selecionado = selecionadoId === terapeuta.id;
            const registro = resolverRegistroProfissional(terapeuta);

            return (
              <li
                key={terapeuta.id}
                data-testid={`opcao-especialista-${terapeuta.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {terapeuta.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[terapeuta.especialidade, registro]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>

                {jaVinculado ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Já faz parte da equipe
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-pressed={selecionado}
                    onClick={() => setSelecionadoId(terapeuta.id)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium"
                  >
                    {selecionado ? "Selecionado" : "Selecionar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-xs font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmarDesabilitado}
            onClick={() => {
              if (!confirmarDesabilitado) {
                void onConfirmarVinculo(selecionadoId);
              }
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar Vínculo
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalVincularEspecialista;
