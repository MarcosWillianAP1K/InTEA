import { useState, useEffect, useRef, useCallback } from "react";

/**
 * ============================================================================
 * CUSTOM HOOK: useAnotacaoDraft (InTEA)
 * Conformidade: RF16 (Prontuário e Anotações), RNF07 (Ergonomia e Usabilidade)
 * TypeScript Estrito: Sem o uso de `any`
 * ============================================================================
 */

export interface UseAnotacaoDraftOptions {
  /** Tempo de debounce em milissegundos antes de persistir no storage (padrão: 500ms) */
  debounceMs?: number;
  /** Valor inicial opcional caso não haja rascunho salvo */
  initialValue?: string;
}

export interface UseAnotacaoDraftReturn {
  /** Conteúdo textual atual do rascunho */
  draft: string;
  /** Função para atualizar o texto do rascunho com salvamento automático via debounce */
  setDraft: (novoTexto: string) => void;
  /** Indica se um rascunho não finalizado foi restaurado da sessão anterior */
  hasRestoredDraft: boolean;
  /** Indica se o salvamento do debounce está em andamento */
  isSavingDraft: boolean;
  /** Data/hora da última persistência no sessionStorage */
  lastSavedAt: Date | null;
  /** Limpa o rascunho do sessionStorage e limpa o texto no estado (após salvar na API ou limpar formulário) */
  clearDraft: () => void;
  /** Descarta o rascunho restaurado, expurgando do sessionStorage e limpando o editor */
  discardDraft: () => void;
  /** Oculta o badge de "Rascunho restaurado" mantendo o texto no editor */
  dismissRestoredBadge: () => void;
}

/**
 * Gera chave única e isolada no sessionStorage combinando pacienteId e sessaoId.
 */
export function getDraftStorageKey(pacienteId?: string, sessaoId?: string): string {
  const pId = pacienteId && pacienteId.trim() ? pacienteId.trim() : "geral";
  const sId = sessaoId && sessaoId.trim() ? `_sessao_${sessaoId.trim()}` : "";
  return `intea_anotacao_draft_${pId}${sId}`;
}

/**
 * Hook para auto-save local de rascunhos de anotações clínicas com debounce de 500ms.
 * Protege terapeutas contra perda acidental de anotações não salvas em F5 ou trocas de aba.
 *
 * @param pacienteId - Identificador do paciente dono do prontuário
 * @param sessaoId - Opcional identificador da sessão clínica vinculada
 * @param options - Opções de configuração (debounceMs, initialValue)
 * @returns Objeto com estado do rascunho, setters e métodos de expurgo
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

