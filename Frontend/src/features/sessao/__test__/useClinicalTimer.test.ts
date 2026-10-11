import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClinicalTimer, formatarTempoClinico } from "../hooks/useClinicalTimer";

describe("Card 5 (Fix) — useClinicalTimer (Front-end 2 — Luma Maiara)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  describe("Função utilitária formatarTempoClinico", () => {
    it("deve retornar 00:00 para valores nulos, negativos ou inválidos", () => {
      expect(formatarTempoClinico(0)).toBe("00:00");
      expect(formatarTempoClinico(-10)).toBe("00:00");
      expect(formatarTempoClinico(NaN)).toBe("00:00");
    });

    it("deve formatar minutos e segundos (MM:SS)", () => {
      expect(formatarTempoClinico(5)).toBe("00:05");
      expect(formatarTempoClinico(65)).toBe("01:05");
      expect(formatarTempoClinico(1200)).toBe("20:00");
    });

    it("deve formatar horas quando duração for >= 3600s (HH:MM:SS)", () => {
      expect(formatarTempoClinico(3665)).toBe("01:01:05");
      expect(formatarTempoClinico(7200)).toBe("02:00:00");
    });
  });

  describe("Cálculo do Delta Real e Avanço no Tempo", () => {
    it("deve iniciar em 00:00 e avançar segundos baseado no delta real", () => {
      const dataInicio = new Date("2026-10-11T10:00:00.000Z").getTime();
      vi.setSystemTime(dataInicio);

      const { result } = renderHook(() =>
        useClinicalTimer({
          sessaoId: "sessao-teste-1",
          ativo: true,
          isPausado: false,
        })
      );

      expect(result.current.segundosDecorridos).toBe(0);
      expect(result.current.tempoFormatado).toBe("00:00");

      // Avança 15 segundos no relógio virtual
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(result.current.segundosDecorridos).toBe(15);
      expect(result.current.tempoFormatado).toBe("00:15");

      // Avança mais 60 segundos
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(result.current.segundosDecorridos).toBe(75);
      expect(result.current.tempoFormatado).toBe("01:15");
    });
  });

  describe("Resiliência a Recarregamento de Página (F5 / Hidratação de sessionStorage)", () => {
    it("deve restaurar o tempo clínico exato a partir do sessionStorage simulando F5", () => {
      const dataInicio = new Date("2026-10-11T10:00:00.000Z").getTime();
      vi.setSystemTime(dataInicio);

      // 1. Primeira montagem: roda por 45 segundos
      const hook1 = renderHook(() =>
        useClinicalTimer({
          sessaoId: "sessao-f5",
          ativo: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(45000);
      });

      expect(hook1.result.current.segundosDecorridos).toBe(45);
      expect(hook1.result.current.tempoFormatado).toBe("00:45");

      // Desmonta o hook simulando fechamento/recarregamento da página
      hook1.unmount();

      // Avança 5 segundos durante a transição do refresh
      vi.advanceTimersByTime(5000);

      // 2. Segunda montagem (F5 simulado): hidrata do sessionStorage
      const hook2 = renderHook(() =>
        useClinicalTimer({
          sessaoId: "sessao-f5",
          ativo: true,
        })
      );

      // Deve ter calculado 45s + 5s = 50s exatos pelo delta de timestamps
      expect(hook2.result.current.segundosDecorridos).toBe(50);
      expect(hook2.result.current.tempoFormatado).toBe("00:50");
    });
  });

  describe("Congelamento Exato em Pausa (Sem acúmulo de tempo ocioso)", () => {
    it("deve congelar a contagem durante a pausa e retomar sem contar o tempo pausado", () => {
      const dataInicio = new Date("2026-10-11T10:00:00.000Z").getTime();
      vi.setSystemTime(dataInicio);

      let pausado = false;
      const { result, rerender } = renderHook(() =>
        useClinicalTimer({
          sessaoId: "sessao-pausa",
          ativo: true,
          isPausado: pausado,
        })
      );

      // Roda por 30 segundos
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      expect(result.current.segundosDecorridos).toBe(30);

      // Entra em pausa
      pausado = true;
      rerender();

      // Passam 120 segundos em pausa
      act(() => {
        vi.advanceTimersByTime(120000);
      });

      // O tempo deve continuar congelado em 30 segundos
      expect(result.current.segundosDecorridos).toBe(30);
      expect(result.current.tempoFormatado).toBe("00:30");

      // Retoma da pausa
      pausado = false;
      rerender();

      // Passam mais 10 segundos ativos
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // O tempo total ativo deve ser 30s + 10s = 40s (ignorando os 120s da pausa)
      expect(result.current.segundosDecorridos).toBe(40);
      expect(result.current.tempoFormatado).toBe("00:40");
    });
  });

  describe("Ações de Reiniciar e Limpar Timer", () => {
    it("deve zerar o timer ao chamar reiniciarTimer()", () => {
      const { result } = renderHook(() =>
        useClinicalTimer({
          sessaoId: "sessao-reset",
          ativo: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(25000);
      });
      expect(result.current.segundosDecorridos).toBe(25);

      act(() => {
        result.current.reiniciarTimer();
      });

      expect(result.current.segundosDecorridos).toBe(0);
      expect(result.current.tempoFormatado).toBe("00:00");
    });

    it("deve remover do sessionStorage ao chamar limparTimer()", () => {
      const { result } = renderHook(() =>
        useClinicalTimer({
          sessaoId: "sessao-clean",
          ativo: true,
        })
      );

      expect(
        window.sessionStorage.getItem("intea_clinical_timer_sessao-clean")
      ).not.toBeNull();

      act(() => {
        result.current.limparTimer();
      });

      expect(
        window.sessionStorage.getItem("intea_clinical_timer_sessao-clean")
      ).toBeNull();
    });
  });
});
