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
 * Converte total de segundos em representação formatada MM:SS ou HH:MM:SS
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
 * ============================================================================
 * HOOK: useClinicalTimer (Front-end 2 — Luma Maiara / Card 5 — Fix)
 * Requisitos: RF12, RNF04
 * 
 * Cronômetro clínico de alta precisão resiliente contra:
 * 1. Desvio por throttling de aba em segundo plano do navegador.
 * 2. Recarregamento acidental de página (F5) via hidratação de sessionStorage.
 * 3. Congelamento exato do delta em pausas sem acúmulo de tempo ocioso.
 * ============================================================================
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

  // Lê ou inicializa o estado de timestamps
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

  // Salva no sessionStorage sempre que o estado de timestamps mudar
  const salvarNoStorage = React.useCallback((data: TimerStorageData) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Calcula o delta real de tempo decorrido em segundos
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
