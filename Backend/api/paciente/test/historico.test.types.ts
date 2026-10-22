// ==============================================================================
// InTEA: DTOs de Tipagem Estrita para Testes do Histórico (Sprint 11)
// Garante conformidade com AGENTS.md: "TypeScript Estrito: Proibido o uso de any"
// ==============================================================================

import type {
  MetricasEngajamentoGeral,
  ResumoJogoPaciente,
  SessaoHistoricoItem,
} from '../models/historico.model.js';

import type {
  SerieMetricaJogo,
} from '../services/paciente-historico.service.js';

/** Shape do data da Rota 1: GET /api/paciente/:id/historico */
export interface RespostaDataHistoricoGeral {
  engajamento: MetricasEngajamentoGeral;
  jogos: ResumoJogoPaciente[];
  meta: {
    paciente_id: string;
    filtros?: { dataInicio?: string; dataFim?: string };
  };
}

/** Shape do data da Rota 2: GET /api/paciente/:id/historico/jogo/:jogoId */
export interface RespostaDataHistoricoJogo {
  jogo: { id: string | number; nome: string; versao: string };
  metricas_declaradas: Array<{ id_metrica: string; tipo_metrica: string }>;
  series_temporais: SerieMetricaJogo[];
  sessoes: SessaoHistoricoItem[];
  meta: {
    paciente_id: string;
    jogo_id: string;
    sessao_referencia_id: string | null;
    paginacao: { page: number; limit: number; total_registros: number };
  };
}

/** Envelope canônico de toda resposta 200 OK */
export interface EnvelopeResposta<T> {
  data: T;
  message: string;
}
