import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// CUSTOM HOOK: useAnotacaoDraft (InTEA)
// TypeScript Estrito: Sem o uso de `any`
// ============================================================================

export interface UseAnotacaoDraftOptions {
  /** Debounce delay in milliseconds before persisting to storage (default: 500ms). */
  debounceMs?: number;
  /** Optional initial text value when no saved draft exists. */
  initialValue?: string;
}

export interface UseAnotacaoDraftReturn {
  /** Current draft text content. */
  draft: string;
  /** Updates draft text and schedules debounced auto-save to sessionStorage. */
  setDraft: (novoTexto: string) => void;
  /** Indicates whether an unfinished draft was restored from a previous session. */
  hasRestoredDraft: boolean;
  /** Indicates whether a debounced save operation is currently pending. */
  isSavingDraft: boolean;
  /** Timestamp of the most recent persistence into sessionStorage. */
  lastSavedAt: Date | null;
  /** Clears the draft from sessionStorage and resets editor state (after saving or resetting the form). */
  clearDraft: () => void;
  /** Discards a restored draft, purging it from sessionStorage and clearing the editor. */
  discardDraft: () => void;
  /** Hides the "Restored draft" badge while preserving the current text in the editor. */
  dismissRestoredBadge: () => void;
}

/**
 * Generates an isolated `sessionStorage` key combining `pacienteId` and optional `sessaoId`.
 *
 * @param pacienteId - Optional UUID of the patient owning the health record.
 * @param sessaoId - Optional UUID of the linked clinical session.
 * @returns Unique storage key string.
 */
export function getDraftStorageKey(pacienteId?: string, sessaoId?: string): string {
  const pId = pacienteId && pacienteId.trim() ? pacienteId.trim() : "geral";
  const sId = sessaoId && sessaoId.trim() ? `_sessao_${sessaoId.trim()}` : "";
  return `intea_anotacao_draft_${pId}${sId}`;
}

/**
 * React hook for local auto-saving of clinical note drafts with a 500ms debounce.
 * Protects therapists against accidental loss of unsaved notes across page reloads or tab switches.
 *
 * @param pacienteId - Identifier of the patient owning the health record.
 * @param sessaoId - Optional identifier of the linked clinical session.
 * @param options - Configuration options (`debounceMs`, `initialValue`).
 * @returns Object containing draft state, setters, and draft lifecycle helpers.
 */
export function useAnotacaoDraft(
  pacienteId?: string,
  sessaoId?: string,
  options: UseAnotacaoDraftOptions = {},
): UseAnotacaoDraftReturn {
  const { debounceMs = 500, initialValue = "" } = options;
  const storageKey = getDraftStorageKey(pacienteId, sessaoId);

  // Inicialização segura com restauração direta do sessionStorage
  const [draft, setDraftState] = useState<string>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const salvo = window.sessionStorage?.getItem(storageKey);
      if (salvo && salvo.trim().length > 0) {
        return salvo;
      }
    } catch {
      // Ignora erro em ambientes restritos de sandbox ou navegação anônima
    }
    return initialValue;
  });

  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const salvo = window.sessionStorage?.getItem(storageKey);
      return Boolean(salvo && salvo.trim().length > 0);
    } catch {
      return false;
    }
  });

  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Ref para armazenar o ID do timer de debounce e permitir cleanup determinístico
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref para indicar se é a primeira montagem e evitar re-gravação imediata do que acabou de ser lido
  const isFirstMount = useRef<boolean>(true);

  // Monitora alterações na chave de armazenamento (ex: troca de paciente ou de sessão)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const salvo = window.sessionStorage?.getItem(storageKey);
      if (salvo && salvo.trim().length > 0) {
        setDraftState(salvo);
        setHasRestoredDraft(true);
      } else {
        setDraftState(initialValue);
        setHasRestoredDraft(false);
      }
    } catch {
      // Falha graciosa de storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Função para atualizar o texto acionando o debounce
  const setDraft = useCallback((novoTexto: string) => {
    setDraftState(novoTexto);
  }, []);

  // Efeito de auto-save no sessionStorage com debounce de 500ms e limpeza de timer
  useEffect(() => {
    // Na primeira montagem não re-salva o valor que foi apenas lido
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (typeof window === "undefined") return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsSavingDraft(true);

    timerRef.current = setTimeout(() => {
      try {
        if (draft.trim().length > 0) {
          window.sessionStorage?.setItem(storageKey, draft);
          setLastSavedAt(new Date());
        } else {
          window.sessionStorage?.removeItem(storageKey);
          setHasRestoredDraft(false);
        }
      } catch {
        // Ignora restrições do storage
      } finally {
        setIsSavingDraft(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [draft, storageKey, debounceMs]);

  // Limpa o rascunho do storage e reseta o texto (ex: após 201 Created na API)
  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsSavingDraft(false);
    setHasRestoredDraft(false);
    setDraftState("");
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage?.removeItem(storageKey);
      }
    } catch {
      // Ignora erro
    }
  }, [storageKey]);

  // Descarta o rascunho restaurado
  const discardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  // Apenas dispensa o badge informativo mantendo o texto digitado
  const dismissRestoredBadge = useCallback(() => {
    setHasRestoredDraft(false);
  }, []);

  return {
    draft,
    setDraft,
    hasRestoredDraft,
    isSavingDraft,
    lastSavedAt,
    clearDraft,
    discardDraft,
    dismissRestoredBadge,
  };
}

export default useAnotacaoDraft;

