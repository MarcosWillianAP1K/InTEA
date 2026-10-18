/**
 * ============================================================================
 * FIXTURES E MOCKS DO DASHBOARD CLÍNICO (bdmock.ts)
 * Indicadores agregados, histórico recente e alertas em memória.
 * Alinhado com as fixtures de Paciente, Sessão e Jogos do ecossistema InTEA.
 * ============================================================================
 */

import type {
  DashboardMetricas,
  SessaoRecenteResumo,
  AlertaClinico,
  AtividadeRecente,
} from "./dashboard.types";
import { MOCK_TERAPEUTA_LOGADO } from "@/shared/types";

// ============================================================================
// FIXTURES DE MÉTRICAS CONSOLIDADAS
// ============================================================================

export const MOCK_DASHBOARD_METRICAS: DashboardMetricas = {
  pacientesAtivos: 14,
  sessoesNoMes: 48,
  tempoMedioEngajamentoMinutos: 28.5,
  taxaRegulacaoDDA: 87.4,
  tempoTotalTerapiaMinutos: 1368,
  variacaoSessoesPercentual: 12.5,
  variacaoPacientesPercentual: 7.1,
  jogosMaisUtilizados: [
    {
      jogoId: "j1111111-1111-4111-8111-111111111111",
      nome: "Pixel Adventure Sensorial",
      totalSessoes: 22,
    },
    {
      jogoId: "j2222222-2222-4222-8222-222222222222",
      nome: "ColorMatch NeuroFocus",
      totalSessoes: 16,
    },
    {
      jogoId: "j3333333-3333-4333-8333-333333333333",
      nome: "Sensory Garden Calming",
      totalSessoes: 10,
    },
  ],
};

// ============================================================================
// FIXTURES DE SESSÕES RECENTES
// ============================================================================

export const MOCK_SESSOES_RECENTES: SessaoRecenteResumo[] = [
  {
    id: "s1111111-1111-4111-8111-111111111111",
    pacienteId: "p1111111-1111-4111-8111-111111111111",
    pacienteNome: "Arthur Silveira",
    jogoId: "j1111111-1111-4111-8111-111111111111",
    jogoNome: "Pixel Adventure Sensorial",
    jogoIcone: "Gamepad2",
    dataHora: "2026-10-17T15:30:00.000Z",
    duracaoSegundos: 1800,
    status: "finalizada",
    nivelEstresseMedio: 28.4,
    engajamentoScore: 92.0,
    ddaIntervencoes: 3,
  },
  {
    id: "s2222222-2222-4222-8222-222222222222",
    pacienteId: "p2222222-2222-4222-8222-222222222222",
    pacienteNome: "Beatriz Lima",
    jogoId: "j2222222-2222-4222-8222-222222222222",
    jogoNome: "ColorMatch NeuroFocus",
    jogoIcone: "Palette",
    dataHora: "2026-10-17T14:00:00.000Z",
    duracaoSegundos: 1500,
    status: "finalizada",
    nivelEstresseMedio: 41.2,
    engajamentoScore: 84.5,
    ddaIntervencoes: 5,
  },
  {
    id: "s3333333-3333-4333-8333-333333333333",
    pacienteId: "p3333333-3333-4333-8333-333333333333",
    pacienteNome: "Cauã Rodrigues",
    jogoId: "j3333333-3333-4333-8333-333333333333",
    jogoNome: "Sensory Garden Calming",
    jogoIcone: "Trees",
    dataHora: "2026-10-16T16:15:00.000Z",
    duracaoSegundos: 1200,
    status: "finalizada",
    nivelEstresseMedio: 22.0,
    engajamentoScore: 89.0,
    ddaIntervencoes: 2,
  },
  {
    id: "s4444444-4444-4444-8444-444444444444",
    pacienteId: "p4444444-4444-4444-8444-444444444444",
    pacienteNome: "Davi Lucas Mendes",
    jogoId: "j1111111-1111-4111-8111-111111111111",
    jogoNome: "Pixel Adventure Sensorial",
    jogoIcone: "Gamepad2",
    dataHora: "2026-10-16T10:00:00.000Z",
    duracaoSegundos: 1800,
    status: "finalizada",
    nivelEstresseMedio: 35.8,
    engajamentoScore: 88.0,
    ddaIntervencoes: 4,
  },
];

// ============================================================================
// FIXTURES DE ALERTAS CLÍNICOS
// ============================================================================

export const MOCK_ALERTAS_CLINICOS: AlertaClinico[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    pacienteId: "p1111111-1111-4111-8111-111111111111",
    pacienteNome: "Arthur Silveira",
    sessaoId: "s1111111-1111-4111-8111-111111111111",
    tipo: "gatilho_detectado",
    severidade: "media",
    mensagem: "Sensibilidade sonora moderada detectada durante fase 3 (ruído acima de 75dB).",
    timestamp: "2026-10-17T15:45:00.000Z",
    lido: false,
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    pacienteId: "p2222222-2222-4222-8222-222222222222",
    pacienteNome: "Beatriz Lima",
    sessaoId: "s2222222-2222-4222-8222-222222222222",
    tipo: "estresse_elevado",
    severidade: "alta",
    mensagem: "Estresse galvânico atingiu 78% na transição de cores rápidas.",
    timestamp: "2026-10-17T14:20:00.000Z",
    lido: false,
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    pacienteId: "p3333333-3333-4333-8333-333333333333",
    pacienteNome: "Cauã Rodrigues",
    tipo: "feedback_pendente",
    severidade: "baixa",
    mensagem: "Relatório da sessão do dia 16/10 pendente de validação clínica.",
    timestamp: "2026-10-16T18:00:00.000Z",
    lido: true,
  },
];

// ============================================================================
// FIXTURES DE ATIVIDADES RECENTES
// ============================================================================

export const MOCK_ATIVIDADES_RECENTES: AtividadeRecente[] = [
  {
    id: "act-1",
    tipo: "fim_sessao",
    titulo: "Sessão Concluída com Sucesso",
    descricao: "Arthur Silveira completou 30 minutos em Pixel Adventure com modulação DDA positiva.",
    timestamp: "2026-10-17T16:00:00.000Z",
    pacienteId: "p1111111-1111-4111-8111-111111111111",
    pacienteNome: "Arthur Silveira",
    terapeutaId: MOCK_TERAPEUTA_LOGADO.id,
  },
  {
    id: "act-2",
    tipo: "anotacao_adicionada",
    titulo: "Nova Anotação de Evolução",
    descricao: "Dr. Marcos registrou evolução da coordenação visomotora de Beatriz Lima.",
    timestamp: "2026-10-17T14:40:00.000Z",
    pacienteId: "p2222222-2222-4222-8222-222222222222",
    pacienteNome: "Beatriz Lima",
    terapeutaId: MOCK_TERAPEUTA_LOGADO.id,
  },
  {
    id: "act-3",
    tipo: "dda_adaptado",
    titulo: "Intervenção Automática DDA",
    descricao: "O motor contextual reduziu a velocidade dos estímulos luminosos para evitar sobrecarga.",
    timestamp: "2026-10-17T14:18:00.000Z",
    pacienteId: "p2222222-2222-4222-8222-222222222222",
    pacienteNome: "Beatriz Lima",
    terapeutaId: MOCK_TERAPEUTA_LOGADO.id,
  },
  {
    id: "act-4",
    tipo: "inicio_sessao",
    titulo: "Sessão Iniciada via Pareamento",
    descricao: "Dispositivo pareado via token remoto para sessão com Cauã Rodrigues.",
    timestamp: "2026-10-16T16:15:00.000Z",
    pacienteId: "p3333333-3333-4333-8333-333333333333",
    pacienteNome: "Cauã Rodrigues",
    terapeutaId: MOCK_TERAPEUTA_LOGADO.id,
  },
];

// Estado volátil dos alertas para suportar mutação em memória
let alertasEstado = [...MOCK_ALERTAS_CLINICOS];

// ============================================================================
// HELPERS MOCK EM MEMÓRIA
// ============================================================================

/**
 * Retorna as métricas consolidadas do painel clínico.
 */
export async function obterMetricasDashboardMock(): Promise<DashboardMetricas> {
  return { ...MOCK_DASHBOARD_METRICAS };
}

/**
 * Retorna as sessões mais recentes com limite opcional.
 */
export async function listarSessoesRecentesMock(
  limite = 5,
): Promise<SessaoRecenteResumo[]> {
  return MOCK_SESSOES_RECENTES.slice(0, Math.max(1, limite));
}

/**
 * Retorna o feed de atividades recentes do terapeuta logado.
 */
export async function listarAtividadesRecentesMock(
  limite = 10,
): Promise<AtividadeRecente[]> {
  return MOCK_ATIVIDADES_RECENTES.slice(0, Math.max(1, limite));
}

/**
 * Retorna alertas clínicos em aberto ou todos os alertas.
 */
export async function listarAlertasClinicosMock(
  apenasNaoLidos = false,
): Promise<AlertaClinico[]> {
  if (apenasNaoLidos) {
    return alertasEstado.filter((a) => !a.lido);
  }
  return [...alertasEstado];
}

/**
 * Marca um alerta clínico como lido.
 */
export async function marcarAlertaLidoMock(alertaId: string): Promise<boolean> {
  const alerta = alertasEstado.find((a) => a.id === alertaId);
  if (alerta) {
    alerta.lido = true;
    return true;
  }
  return false;
}
