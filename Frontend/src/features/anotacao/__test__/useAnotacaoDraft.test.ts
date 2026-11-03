import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnotacaoDraft, getDraftStorageKey } from "../hooks/useAnotacaoDraft";

describe("useAnotacaoDraft — Auto-Save Local de Rascunho (RF16, RNF07, Issue #164)", () => {
  const pacienteId = "paciente-uuid-123";
  const sessaoId = "sessao-uuid-456";
  const chaveEsperada = getDraftStorageKey(pacienteId, sessaoId);

  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it("deve gerar a chave de storage isolada corretamente para paciente e sessão", () => {
    expect(getDraftStorageKey("pac-1", "sess-1")).toBe("intea_anotacao_draft_pac-1_sessao_sess-1");
    expect(getDraftStorageKey("pac-1", undefined)).toBe("intea_anotacao_draft_pac-1");
    expect(getDraftStorageKey(undefined, undefined)).toBe("intea_anotacao_draft_geral");
  });

  it("deve inicializar com valor vazio e hasRestoredDraft false quando não houver rascunho salvo", () => {
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    expect(result.current.draft).toBe("");
    expect(result.current.hasRestoredDraft).toBe(false);
    expect(result.current.isSavingDraft).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
  });

  it("deve restaurar automaticamente o rascunho salvo no sessionStorage ao montar", () => {
    window.sessionStorage.setItem(chaveEsperada, "Evolução clínica em andamento...");

    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    expect(result.current.draft).toBe("Evolução clínica em andamento...");
    expect(result.current.hasRestoredDraft).toBe(true);
  });

  it("deve salvar automaticamente o rascunho no sessionStorage após debounce de 500ms", () => {
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    act(() => {
      result.current.setDraft("Paciente demonstrou excelente resposta...");
    });

    // Antes de 500ms, ainda não deve ter persistido no sessionStorage
    expect(window.sessionStorage.getItem(chaveEsperada)).toBeNull();
    expect(result.current.isSavingDraft).toBe(true);

    // Avança 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(window.sessionStorage.getItem(chaveEsperada)).toBe("Paciente demonstrou excelente resposta...");
    expect(result.current.isSavingDraft).toBe(false);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it("deve reiniciar o timer de debounce quando múltiplos caracteres forem digitados sequencialmente (cleanup)", () => {
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    act(() => {
      result.current.setDraft("Primeira");
    });
    act(() => {
      vi.advanceTimersByTime(300); // 300ms passaram
    });

    // Usuário continua digitando antes dos 500ms
    act(() => {
      result.current.setDraft("Primeira frase completa.");
    });
    act(() => {
      vi.advanceTimersByTime(300); // Mais 300ms (total 600ms, mas apenas 300ms desde a última digitação)
    });

    // Ainda não deve ter salvo porque o timer foi resetado
    expect(window.sessionStorage.getItem(chaveEsperada)).toBeNull();

    // Completa os 200ms restantes
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(window.sessionStorage.getItem(chaveEsperada)).toBe("Primeira frase completa.");
  });

  it("deve remover do sessionStorage se o texto for completamente apagado após o debounce", () => {
    window.sessionStorage.setItem(chaveEsperada, "Texto anterior");
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    act(() => {
      result.current.setDraft("   ");
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(window.sessionStorage.getItem(chaveEsperada)).toBeNull();
    expect(result.current.hasRestoredDraft).toBe(false);
  });

  it("deve expurgar imediatamente do sessionStorage ao chamar clearDraft() (após salvar na API)", () => {
    window.sessionStorage.setItem(chaveEsperada, "Rascunho a ser salvo");
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    expect(result.current.draft).toBe("Rascunho a ser salvo");

    act(() => {
      result.current.clearDraft();
    });

    expect(window.sessionStorage.getItem(chaveEsperada)).toBeNull();
    expect(result.current.draft).toBe("");
    expect(result.current.hasRestoredDraft).toBe(false);
  });

  it("deve descartar rascunho ao chamar discardDraft()", () => {
    window.sessionStorage.setItem(chaveEsperada, "Rascunho indesejado");
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    act(() => {
      result.current.discardDraft();
    });

    expect(window.sessionStorage.getItem(chaveEsperada)).toBeNull();
    expect(result.current.draft).toBe("");
    expect(result.current.hasRestoredDraft).toBe(false);
  });

  it("deve permitir dispensar o badge com dismissRestoredBadge mantendo o texto do rascunho", () => {
    window.sessionStorage.setItem(chaveEsperada, "Texto recuperado");
    const { result } = renderHook(() => useAnotacaoDraft(pacienteId, sessaoId));

    expect(result.current.hasRestoredDraft).toBe(true);

    act(() => {
      result.current.dismissRestoredBadge();
    });

    expect(result.current.hasRestoredDraft).toBe(false);
    expect(result.current.draft).toBe("Texto recuperado");
  });

  it("deve isolar rascunhos de pacientes e sessões distintas", () => {
    const chave1 = getDraftStorageKey("paciente-A", undefined);
    const chave2 = getDraftStorageKey("paciente-B", undefined);

    window.sessionStorage.setItem(chave1, "Anotação Paciente A");
    window.sessionStorage.setItem(chave2, "Anotação Paciente B");

    const hookA = renderHook(() => useAnotacaoDraft("paciente-A"));
    const hookB = renderHook(() => useAnotacaoDraft("paciente-B"));

    expect(hookA.result.current.draft).toBe("Anotação Paciente A");
    expect(hookB.result.current.draft).toBe("Anotação Paciente B");
  });
});

