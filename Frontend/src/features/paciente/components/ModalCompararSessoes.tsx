"use client";

import { useMemo } from "react";
import {
  Gamepad2,
  Calendar,
  Clock,
  Activity,
  Layers,
  AlertTriangle,
  X,
  Info,
} from "lucide-react";
import type { Sessao } from "@/features/sessao/types/sessao.types";
import { TabelaComparativaMetricas } from "./TabelaComparativaMetricas";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";

export interface ModalCompararSessoesProps {
  isOpen: boolean;
  onClose: () => void;
  sessaoA?: Sessao | null;
  sessaoB?: Sessao | null;
  loading?: boolean;
  pacienteNome?: string;
}

export function ModalCompararSessoes({
  isOpen,
  onClose,
  sessaoA,
  sessaoB,
  loading = false,
  pacienteNome,
}: ModalCompararSessoesProps) {
  // Ordena cronologicamente: a mais antiga como Baseline (A) e a mais recente como Comparada (B)
  const [sessaoBaseline, sessaoRecente] = useMemo(() => {
    if (!sessaoA || !sessaoB) return [sessaoA ?? null, sessaoB ?? null];

    const dataA = new Date(
      sessaoA.data_hora_inicio || sessaoA.created_at || 0,
    ).getTime();
    const dataB = new Date(
      sessaoB.data_hora_inicio || sessaoB.created_at || 0,
    ).getTime();

    if (dataA <= dataB) {
      return [sessaoA, sessaoB];
    }
    return [sessaoB, sessaoA];
  }, [sessaoA, sessaoB]);

  // Identifica o jogo de cada sessão
  const nomeJogoA =
    sessaoBaseline?.jogo?.nome || sessaoBaseline?.jogo?.titulo || "Jogo A";
  const nomeJogoB =
    sessaoRecente?.jogo?.nome || sessaoRecente?.jogo?.titulo || "Jogo B";

  const mesmoJogo = useMemo(() => {
    if (!sessaoBaseline || !sessaoRecente) return false;
    if (sessaoBaseline.jogo_id && sessaoRecente.jogo_id) {
      return sessaoBaseline.jogo_id === sessaoRecente.jogo_id;
    }
    return nomeJogoA.toLowerCase().trim() === nomeJogoB.toLowerCase().trim();
  }, [sessaoBaseline, sessaoRecente, nomeJogoA, nomeJogoB]);

  const formatarData = (iso?: string | null) => {
    if (!iso) return "Data não registrada";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const formatarDuracao = (segundos?: number | null) => {
    if (!segundos || segundos <= 0) return "N/I";
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    if (min === 0) return `${seg}s`;
    return seg > 0 ? `${min}m ${seg}s` : `${min} min`;
  };

  const obterDuracao = (sessao: Sessao) =>
    (sessao as Sessao & { duracao_segundos?: number | null }).duracao_segundos;

  const calcularIntervaloDias = () => {
    if (!sessaoBaseline?.data_hora_inicio || !sessaoRecente?.data_hora_inicio)
      return null;
    try {
      const tA = new Date(sessaoBaseline.data_hora_inicio).getTime();
      const tB = new Date(sessaoRecente.data_hora_inicio).getTime();
      const diffDias = Math.round(Math.abs(tB - tA) / (1000 * 60 * 60 * 24));
      if (diffDias === 0) return "Realizadas no mesmo dia";
      if (diffDias === 1) return "Intervalo de 1 dia entre as intervenções";
      return `Intervalo de ${diffDias} dias entre as intervenções`;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title-comparar"
        aria-describedby="dialog-desc-comparar"
      >
        {/* Cabeçalho do Diálogo */}
        <DialogHeader className="border-b border-border pb-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle
                  id="dialog-title-comparar"
                  className="text-xl font-bold tracking-tight text-foreground"
                >
                  Comparação Analítica de Sessões
                </DialogTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  {mesmoJogo ? nomeJogoA : "Partidas Múltiplas"}
                </Badge>
              </div>
              <DialogDescription
                id="dialog-desc-comparar"
                className="text-xs text-muted-foreground"
              >
                {pacienteNome
                  ? `Análise de evolução clínica longitudinal do paciente ${pacienteNome}.`
                  : "Análise quantitativa de deltas entre sessões clínicas finalizadas."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CENÁRIO 1: Sessões Insuficientes */}
        {!sessaoBaseline || !sessaoRecente ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <Info className="h-10 w-10 text-muted-foreground/60" />
            <h4 className="font-semibold text-foreground text-sm">
              Seleção Incompleta de Partidas
            </h4>
            <p className="text-xs max-w-md">
              Para efetuar a análise comparativa métrica a métrica, é necessário
              selecionar exatamente duas sessões finalizadas no histórico do
              paciente.
            </p>
            <Button
              variant="outline"
              onClick={onClose}
              className="mt-2 text-xs font-semibold min-h-11 min-w-11 px-6 rounded-xl cursor-pointer"
            >
              Fechar
            </Button>
          </div>
        ) : !mesmoJogo ? (
          /* CENÁRIO 2: INCOMPATIBLE STATE (Jogos Diferentes) */
          <div
            className="py-10 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground"
            data-testid="estado-jogos-incompativeis"
          >
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="flex flex-col gap-1.5 max-w-md">
              <h4 className="text-base font-bold text-foreground">
                Jogos Terapêuticos Incompatíveis para Comparação Direta
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A comparação quantitativa de métricas exige que ambas as sessões
                pertençam ao mesmo jogo terapêutico, garantindo equivalência nas
                mecânicas de estímulo e resposta motora.
              </p>
            </div>

            {/* Comparativo Visual dos Jogos Selecionados */}
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-surface-alt dark:bg-surface-highlight border border-border w-full max-w-lg justify-center">
              <div className="flex flex-col items-center sm:items-start text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Sessão 1 (Baseline)
                </span>
                <span className="font-semibold text-foreground mt-0.5">
                  {nomeJogoA}
                </span>
              </div>

              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </div>

              <div className="flex flex-col items-center sm:items-end text-xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Sessão 2 (Comparada)
                </span>
                <span className="font-semibold text-foreground mt-0.5">
                  {nomeJogoB}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              Por favor, selecione duas partidas do mesmo jogo (ex.: duas
              sessões de "{nomeJogoA}") para calcular os deltas de evolução.
            </p>

            <Button
              variant="default"
              onClick={onClose}
              className="mt-2 min-h-11 min-w-11 px-6 text-xs font-bold rounded-xl cursor-pointer"
            >
              Entendido, ajustar seleção
            </Button>
          </div>
        ) : (
          /* CENÁRIO 3: SUCCESS STATE (Mesmo Jogo) */
          <div className="flex flex-col gap-6 pt-2">
            {/* Metadados Comparativos Lado a Lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Sessão A (Baseline) */}
              <div
                className="p-4 rounded-xl border border-border bg-surface-alt/60 dark:bg-surface-highlight/40 flex flex-col gap-2.5 shadow-2xs"
                data-testid="card-sessao-baseline"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-xs font-bold text-foreground">
                      Sessão A (Baseline Histórico)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Token: {sessaoBaseline.session_token || "—"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{formatarData(sessaoBaseline.data_hora_inicio)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Duração:{" "}
                      <strong className="text-foreground font-semibold">
                        {formatarDuracao(obterDuracao(sessaoBaseline))}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Estresse DDA:{" "}
                      <strong className="text-foreground font-semibold">
                        {sessaoBaseline.contexto_dda_json?.estresse_inicial ??
                          "Padrão"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Status:{" "}
                      {sessaoBaseline.status_sessao === "pausada" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          Em Pausa
                        </span>
                      ) : sessaoBaseline.status_sessao === "em_andamento" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Em Andamento
                        </span>
                      ) : (
                        <strong className="text-foreground capitalize font-semibold">
                          {sessaoBaseline.status_sessao === "finalizada"
                            ? "Finalizada"
                            : sessaoBaseline.status_sessao}
                        </strong>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Sessão B (Recente) */}
              <div
                className="p-4 rounded-xl border border-border bg-surface-alt/60 dark:bg-surface-highlight/40 flex flex-col gap-2.5 shadow-2xs"
                data-testid="card-sessao-recente"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-600" />
                    <span className="text-xs font-bold text-foreground">
                      Sessão B (Mais Recente)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Token: {sessaoRecente.session_token || "—"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{formatarData(sessaoRecente.data_hora_inicio)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Duração:{" "}
                      <strong className="text-foreground font-semibold">
                        {formatarDuracao(obterDuracao(sessaoRecente))}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Estresse DDA:{" "}
                      <strong className="text-foreground font-semibold">
                        {sessaoRecente.contexto_dda_json?.estresse_inicial ??
                          "Padrão"}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Status:{" "}
                      {sessaoRecente.status_sessao === "pausada" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          Em Pausa
                        </span>
                      ) : sessaoRecente.status_sessao === "em_andamento" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Em Andamento
                        </span>
                      ) : (
                        <strong className="text-foreground capitalize font-semibold">
                          {sessaoRecente.status_sessao === "finalizada"
                            ? "Finalizada"
                            : sessaoRecente.status_sessao}
                        </strong>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de Intervalo Temporal */}
            {calcularIntervaloDias() && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{calcularIntervaloDias()}</span>
              </div>
            )}

            {/* Tabela Comparativa de Métricas com Cálculo de Delta e Polaridade */}
            <TabelaComparativaMetricas
              sessaoA={sessaoBaseline}
              sessaoB={sessaoRecente}
              loading={loading}
              labelA="Sessão A (Base)"
              labelB="Sessão B (Recente)"
            />

            {/* Rodapé e Botões com Área Mínima de Toque (44x44px) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-[11px] text-muted-foreground">
                * Deltas em verde indicam evolução clínica favorável conforme a
                polaridade da métrica.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="min-h-11 min-w-11 px-6 text-xs font-semibold rounded-xl cursor-pointer"
                  data-testid="botao-fechar-modal-comparar"
                >
                  Fechar Comparativo
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ModalCompararSessoes;
