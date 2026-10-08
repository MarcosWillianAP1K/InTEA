import { useState, useEffect, useCallback, useRef } from "react";
import { SessionSocketManager, type EventoTelemetriaPayload } from "@/core/web.socket";
import type { MetricasTelemetria, PontoHistoricoTelemetria } from "../types";

/**
 * ============================================================================
 * HOOK REATIVO: useLiveTelemetry (Front-end 2 — Luma Maiara)
 * Requisitos: RF12 (Gestão de Sessão), RN02 (Tipagem Estrita), RNF04
 * ============================================================================
 */

export interface UseLiveTelemetryOptions {
  habilitado?: boolean;
  maxPontosHistorico?: number;
  initialMetricas?: Partial<MetricasTelemetria>;
}

/**
 * Hook para consumo reativo e agregação em tempo real de telemetria recebida via WebSocket.
 * Processa métricas clínicas, calcula taxa de acertos e mantém janela histórica deslizante de atenção/engajamento.
 *
 * @param options - Configurações opcionais de inicialização, limites de histórico e métricas prévias.
 * @returns Objeto contendo métricas consolidadas, série temporal de histórico e métodos de limpeza/processamento.
 */
export function useLiveTelemetry(options: UseLiveTelemetryOptions = {}) {
  const { habilitado = true, maxPontosHistorico = 20, initialMetricas } = options;

  const [metricas, setMetricas] = useState<MetricasTelemetria>({
    acertos: initialMetricas?.acertos ?? 0,
    erros: initialMetricas?.erros ?? 0,
    tempoMedioRespostaMs: initialMetricas?.tempoMedioRespostaMs ?? 0,
    nivelEngajamento: initialMetricas?.nivelEngajamento ?? 85,
    nivelAtencao: initialMetricas?.nivelAtencao ?? 90,
    nivelEstresseAtual: initialMetricas?.nivelEstresseAtual ?? 1,
    totalEventos: initialMetricas?.totalEventos ?? 0,
  });

  const [historico, setHistorico] = useState<PontoHistoricoTelemetria[]>([]);
  const contadorSegundosRef = useRef<number>(0);
  const totalTemposRef = useRef<{ soma: number; contagem: number }>({
    soma: 0,
    contagem: 0,
  });

  /**
   * Processa um evento unitário de telemetria atualizando contadores, tempos de resposta e série temporal.
   */
  const processarEvento = useCallback(
    (evento: EventoTelemetriaPayload) => {
      contadorSegundosRef.current += 1;
      const segundoAtual = contadorSegundosRef.current;
      const min = Math.floor(segundoAtual / 60);
      const sec = segundoAtual % 60;
      const tempoFormatado = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;

      const { dados } = evento;
      const isAcerto =
        dados.acerto === true ||
        evento.tipo_evento === "acerto" ||
        dados.id_metrica === "acerto";
      const isErro =
        dados.acerto === false ||
        evento.tipo_evento === "erro" ||
        dados.id_metrica === "erro";

      let tempoResposta = typeof dados.tempo_resposta_ms === "number" ? dados.tempo_resposta_ms : undefined;
      if (tempoResposta === undefined && dados.id_metrica === "tempo_resposta" && typeof dados.valor === "number") {
        tempoResposta = dados.valor > 100 ? dados.valor : dados.valor * 1000;
      }

      setMetricas((prev) => {
        const novosAcertos = isAcerto ? prev.acertos + 1 : prev.acertos;
        const novosErros = isErro ? prev.erros + 1 : prev.erros;
        const novoTotal = prev.totalEventos + 1;

        if (tempoResposta !== undefined && tempoResposta > 0) {
          totalTemposRef.current.soma += tempoResposta;
          totalTemposRef.current.contagem += 1;
        }

        const mediaResposta =
          totalTemposRef.current.contagem > 0
            ? Math.round(totalTemposRef.current.soma / totalTemposRef.current.contagem)
            : prev.tempoMedioRespostaMs;

        const novoEngajamento =
          typeof dados.engajamento === "number"
            ? Math.min(100, Math.max(0, dados.engajamento))
            : prev.nivelEngajamento;

        const novaAtencao =
          typeof dados.atencao === "number"
            ? Math.min(100, Math.max(0, dados.atencao))
            : prev.nivelAtencao;

        const novoEstresse =
          typeof dados.estresse === "number"
            ? Math.min(5, Math.max(1, Math.round(dados.estresse)))
            : prev.nivelEstresseAtual;

        return {
          acertos: novosAcertos,
          erros: novosErros,
          tempoMedioRespostaMs: mediaResposta,
          nivelEngajamento: novoEngajamento,
          nivelAtencao: novaAtencao,
          nivelEstresseAtual: novoEstresse,
          totalEventos: novoTotal,
        };
      });

      setHistorico((prev) => {
        const ponto: PontoHistoricoTelemetria = {
          tempoFormatado,
          segundo: segundoAtual,
          atencao: typeof dados.atencao === "number" ? dados.atencao : 85,
          engajamento: typeof dados.engajamento === "number" ? dados.engajamento : 80,
          estresse: typeof dados.estresse === "number" ? dados.estresse : 1,
        };
        const novoHistorico = [...prev, ponto];
        if (novoHistorico.length > maxPontosHistorico) {
          return novoHistorico.slice(novoHistorico.length - maxPontosHistorico);
        }
        return novoHistorico;
      });
    },
    [maxPontosHistorico]
  );

  useEffect(() => {
    if (!habilitado) return;

    const manager = SessionSocketManager.getInstance();
    const unsubscribe = manager.onTelemetria((evento) => {
      processarEvento(evento);
    });

    return () => {
      unsubscribe();
    };
  }, [habilitado, processarEvento]);

  /**
   * Reseta os contadores de métricas acumuladas e limpa os pontos do gráfico histórico.
   */
  const limparTelemetria = useCallback(() => {
    setMetricas({
      acertos: 0,
      erros: 0,
      tempoMedioRespostaMs: 0,
      nivelEngajamento: 0,
      nivelAtencao: 0,
      nivelEstresseAtual: 1,
      totalEventos: 0,
    });
    setHistorico([]);
    contadorSegundosRef.current = 0;
    totalTemposRef.current = { soma: 0, contagem: 0 };
  }, []);

  return {
    metricas,
    historico,
    processarEvento,
    limparTelemetria,
    temDados: metricas.totalEventos > 0,
  };
}
