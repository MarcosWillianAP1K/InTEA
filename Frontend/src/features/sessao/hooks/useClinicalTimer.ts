import * as React from "react";

export interface UseClinicalTimerOptions {
  sessaoId?: string;
  ativo?: boolean;
  isPausado?: boolean;
  intervaloMs?: number;
  dataHoraInicioInicial?: string | null;
  onTick?: (segundos: number) => void;
}

export interface UseClinicalTimerReturn {
  segundosDecorridos: number;
  tempoFormatado: string;
  horas: number;
  minutos: number;
  segundos: number;
  isAtivo: boolean;
  isPausado: boolean;
  reiniciarTimer: () => void;
  limparTimer: () => void;
}

interface TimerStorageData {
  timestampInicio: number;
  tempoAcumuladoPausaMs: number;
  timestampUltimaPausa: number | null;
  isPausado: boolean;
}

/**
 * Formats total seconds into MM:SS or HH:MM:SS string representation.
 *
 * @param totalSegundos - Number of elapsed seconds.
 * @returns Formatted time string.
 */
export function formatarTempoClinico(totalSegundos: number): string {
  if (isNaN(totalSegundos) || totalSegundos <= 0) return "00:00";

  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = Math.floor(totalSegundos % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (horas > 0) {
    return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
  }
  return `${pad(minutos)}:${pad(segundos)}`;
}

/**
 * High-precision clinical session timer hook with persistence and pause handling.
 * Protects against background tab throttling and page reloads via sessionStorage (RF12, RNF04).
 *
 * @param options - Configuration options for session timer.
 * @returns Timer state, formatted elapsed time, and control methods.
 */
export function useClinicalTimer(
  options: UseClinicalTimerOptions = {}
): UseClinicalTimerReturn {
  const {
    sessaoId,
    ativo = true,
    isPausado = false,
    intervaloMs = 1000,
    dataHoraInicioInicial,
    onTick,
  } = options;

  const storageKey = `intea_clinical_timer_${sessaoId || "default"}`;

  /**
   * Reads the timestamp state persisted in sessionStorage, or initializes
   * a new zero state anchoring the start timestamp to `dataHoraInicioInicial`
   * when available.
   */
  const carregarEstadoInicial = (): TimerStorageData => {
    if (typeof window === "undefined") {
      return {
        timestampInicio: Date.now(),
        tempoAcumuladoPausaMs: 0,
        timestampUltimaPausa: null,
        isPausado: false,
      };
    }

    try {
      const salvo = window.sessionStorage.getItem(storageKey);
      if (salvo) {
        const parsed = JSON.parse(salvo) as TimerStorageData;
        if (typeof parsed.timestampInicio === "number" && !isNaN(parsed.timestampInicio)) {
          return parsed;
        }
      }
    } catch {
      // Fallback silencioso em caso de erro no sessionStorage
    }

    const agora = Date.now();
    const tsInicio = dataHoraInicioInicial
      ? new Date(dataHoraInicioInicial).getTime() || agora
      : agora;

    const inicial: TimerStorageData = {
      timestampInicio: tsInicio,
      tempoAcumuladoPausaMs: 0,
      timestampUltimaPausa: null,
      isPausado: false,
    };

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(inicial));
    } catch {
      // ignore
    }

    return inicial;
  };

  const timerDataRef = React.useRef<TimerStorageData>(carregarEstadoInicial());

  /**
   * Persists the current timer state (timestamps and pause control) to
   * sessionStorage, ensuring resilience against page reloads.
   */
  const salvarNoStorage = React.useCallback((data: TimerStorageData) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [storageKey]);

  /**
   * Calculates the real elapsed time delta in seconds.
   * When paused, freezes the calculation at the last pause instant;
   * otherwise uses `Date.now()` minus the accumulated paused time.
   */
  const calcularSegundos = React.useCallback(() => {
    const data = timerDataRef.current;
    const agora = Date.now();

    let tempoEfetivoMs = 0;
    if (data.isPausado && data.timestampUltimaPausa) {
      tempoEfetivoMs =
        data.timestampUltimaPausa - data.timestampInicio - data.tempoAcumuladoPausaMs;
    } else {
      tempoEfetivoMs = agora - data.timestampInicio - data.tempoAcumuladoPausaMs;
    }

    return Math.max(0, Math.floor(tempoEfetivoMs / 1000));
  }, []);

  const [segundosDecorridos, setSegundosDecorridos] = React.useState<number>(() => {
    return ativo ? calcularSegundos() : 0;
  });

  // Trata transição de pausa / despausa
  React.useEffect(() => {
    if (!ativo) return;

    const data = timerDataRef.current;
    const agora = Date.now();

    if (isPausado && !data.isPausado) {
      // Entrando em pausa
      data.isPausado = true;
      data.timestampUltimaPausa = agora;
      salvarNoStorage(data);
    } else if (!isPausado && data.isPausado) {
      // Saindo da pausa: acumula tempo pausado
      if (data.timestampUltimaPausa) {
        const tempoDormido = agora - data.timestampUltimaPausa;
        data.tempoAcumuladoPausaMs += tempoDormido;
      }
      data.isPausado = false;
      data.timestampUltimaPausa = null;
      salvarNoStorage(data);
    }

    setSegundosDecorridos(calcularSegundos());
  }, [isPausado, ativo, salvarNoStorage, calcularSegundos]);

  // Intervalo de atualização (tick de alta precisão baseado em delta)
  React.useEffect(() => {
    if (!ativo || isPausado) return;

    // Atualiza imediatamente na ativação
    const segsIniciais = calcularSegundos();
    setSegundosDecorridos(segsIniciais);
    onTick?.(segsIniciais);

    const timer = setInterval(() => {
      const novosSegs = calcularSegundos();
      setSegundosDecorridos(novosSegs);
      onTick?.(novosSegs);
    }, intervaloMs);

    return () => clearInterval(timer);
  }, [ativo, isPausado, intervaloMs, calcularSegundos, onTick]);

  /**
   * Resets the timer to zero, overwriting the sessionStorage state
   * with a new start timestamp set to the current moment.
   */
  const reiniciarTimer = React.useCallback(() => {
    const agora = Date.now();
    const novo: TimerStorageData = {
      timestampInicio: agora,
      tempoAcumuladoPausaMs: 0,
      timestampUltimaPausa: null,
      isPausado: false,
    };
    timerDataRef.current = novo;
    salvarNoStorage(novo);
    setSegundosDecorridos(0);
  }, [salvarNoStorage]);

  /**
   * Removes the timer state from sessionStorage and resets elapsed seconds
   * to zero; intended to be called on component unmount or session teardown.
   */
  const limparTimer = React.useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    setSegundosDecorridos(0);
  }, [storageKey]);

  const horas = Math.floor(segundosDecorridos / 3600);
  const minutos = Math.floor((segundosDecorridos % 3600) / 60);
  const segundos = segundosDecorridos % 60;
  const tempoFormatado = formatarTempoClinico(segundosDecorridos);

  return {
    segundosDecorridos,
    tempoFormatado,
    horas,
    minutos,
    segundos,
    isAtivo: ativo,
    isPausado,
    reiniciarTimer,
    limparTimer,
  };
}
