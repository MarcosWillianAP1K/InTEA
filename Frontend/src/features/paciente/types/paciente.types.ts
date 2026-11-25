// ============================================================================
// TIPAGENS CANÔNICAS DO DOMÍNIO PACIENTE (InTEA)
// Regra: TypeScript estrito sem o uso de `any`, snakes_case da API REST
// ============================================================================

import {
  ESTADO_CLINICO_NAO_INFORMADO,
  ULTIMA_SESSAO_VAZIA,
} from "../constants/condicoesClinicas";

export interface Responsavel {
  id: string;
  nome: string;
  cpf?: string | null;
  data_nascimento?: string | null;
  telefone: string;
  email?: string | null;
  parentesco?: string | null;
  tipo_responsavel?: "principal" | "extra" | string | null;
  principal?: boolean;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DadosClinicos {
  id: string;
  paciente_id: string;
  diagnostico_base: string; // Ex: "TEA Nível 1", "TEA Nível 2", "TEA Nível 3"
  gatilhos_sensoriais?: string[];
  observacoes_gerais?: string | null;
  metadados?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export type CategoriaGatilho =
  | "sensorial"
  | "rotina"
  | "ambiental"
  | "emocional"
  | string;

export type GrauSeveridadeGatilho = "leve" | "moderado" | "severo";

export interface Gatilho {
  id: string;
  nome: string;
  categoria: CategoriaGatilho;
  descricao?: string | null;
  created_at?: string;
}

export interface PacienteGatilho {
  paciente_id: string;
  gatilho_id: string;
  grau_severidade: GrauSeveridadeGatilho;
  observacoes?: string | null;
  created_at?: string;
  gatilho?: Gatilho;
}

export interface LaudoClinico {
  id: string;
  paciente_id: string;
  terapeuta_id: string;
  titulo: string;
  descricao?: string | null;
  arquivo_caminho: string;
  arquivo_nome_original: string;
  arquivo_mime_type: string;
  tamanho_bytes?: number | null;
  created_at: string;
  updated_at?: string;
  terapeuta?: {
    id: string;
    nome: string;
    especialidade?: string | null;
    registro_profissional?: string | null;
  };
}

export interface TerapeutaVinculado {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  crp?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  eh_responsavel?: boolean;
  status_ativo?: boolean;
}

/**
 * Canonical contract for a Specialist belonging to a patient's Multidisciplinary Team.
 */
export interface EspecialistaVinculado {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  crp?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  papel_equipe?: string | null;
  eh_responsavel?: boolean;
  created_at?: string;
  status_ativo?: boolean;
}

export interface TerapeutaPaciente {
  terapeuta_id: string;
  paciente_id: string;
  papel_equipe?: string | null;
  eh_responsavel?: boolean;
  created_at?: string;
  terapeuta?: TerapeutaVinculado;
}

/**
 * Canonical Patient domain entity mapped to Supabase database schema and REST API.
 */
export interface Paciente {
  id: string; // UUID v4
  clinica_id: string; // UUID da clínica vinculada
  nome: string;
  data_nascimento: string; // ISO 8601 YYYY-MM-DD
  telefone?: string | null;
  cpf?: string | null;
  foto_url?: string | null;
  photoUrl?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  status_ativo: boolean;
  consentimento_lgpd?: boolean;
  terapeuta_responsavel_id?: string | null;
  ultima_sessao_em?: string | null;
  estado_clinico?: string | null;
  created_at: string;
  updated_at: string;
  responsaveis?: Responsavel[];
  terapeutas?: TerapeutaPaciente[];
  dados_clinicos?: DadosClinicos | null;
  gatilhos?: PacienteGatilho[];
  laudos?: LaudoClinico[];
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CriarResponsavelDTO {
  id?: string;
  nome: string;
  telefone: string;
  cpf?: string | null;
  data_nascimento?: string | null;
  email?: string | null;
  parentesco?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  mesmo_endereco_paciente?: boolean;
}

export interface CriarDadosClinicosDTO {
  diagnostico_base?: string | null;
  gatilhos_sensoriais?: string[];
  observacoes_gerais?: string | null;
}

export interface CriarPacienteDTO {
  nome: string;
  data_nascimento: string; // YYYY-MM-DD
  cpf: string;
  clinica_id?: string | null;
  telefone?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  responsavel?: CriarResponsavelDTO | null;
  responsavel_extra?: CriarResponsavelDTO | null;
  dados_clinicos?: CriarDadosClinicosDTO | null;
}

export interface AtualizarPacienteDTO {
  nome?: string;
  data_nascimento?: string;
  clinica_id?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  foto_url?: string | null;
  photoUrl?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  status_ativo?: boolean;
  responsavel?: CriarResponsavelDTO | null;
  responsavel_extra?: CriarResponsavelDTO | null;
  dados_clinicos?: CriarDadosClinicosDTO | null;
}

export interface FiltroPacienteDTO {
  nome?: string;
  cpf?: string;
  idadeMin?: number;
  idadeMax?: number;
  incluirInativos?: boolean;
  all?: boolean;
  page?: number;
  limit?: number;
}

export interface VincularTerapeutaDTO {
  terapeuta_id: string;
}

export interface PacienteRespostaApi {
  data:
    | Paciente
    | {
        paciente: Paciente;
        responsaveis?: Responsavel[];
        dados_clinicos?: DadosClinicos;
        responsavel?: Responsavel | null;
        gatilhos?: PacienteGatilho[];
        laudos?: LaudoClinico[];
        terapeuta_responsavel_id?: string | null;
      };
  message?: string;
}

export interface PacientesListaRespostaApi {
  data:
    | Paciente[]
    | {
        pacientes: Paciente[];
        meta?: {
          total: number;
          pagina?: number;
          limite?: number;
          total_paginas?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        };
      };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

// ============================================================================
// TIPAGENS DE APRESENTAÇÃO / VIEW MODEL (UI InTEA)
// Utilizadas em telas de pacientes, cockpit e formulários de cadastro.
// ============================================================================

export type PatientStatus =
  | "IN_PROGRESS"
  | "FINISHED"
  | "EVALUATION"
  | "ATTENTION";

export type PatientGender = "M" | "F";

export interface PatientAddress {
  cep: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string;
  number: string;
}

export interface PatientResponsible {
  name: string;
  birthDate: string;
  phone: string;
  cpf: string;
  address?: PatientAddress;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: PatientGender;
  birthDate: string;
  photoUrl: string;
  category: string; // Ex: "TEA Nível 1", "TEA Nível 2", "TEA Nível 3", "Avaliação Inicial"
  clinicalStatus: string;
  progress: number; // 0 a 100
  performanceScore?: number; // 0 a 100
  performanceHistory?: number[]; // Histórico de pontos para sparkline de tendência
  lastSessionDate: string; // Ex: "08/09, 14:08"
  status: PatientStatus;
  responsibleName: string;
  responsiblePhone: string;
  therapist: string;
  communicationStyle: string;
  sensorySensitivities: string[];
  notes: string;
  phone?: string;
  cpf?: string;
  clinicaId?: string | null;
  statusAtivo?: boolean;
  address?: PatientAddress;
  responsible?: PatientResponsible;
  extraResponsible?: PatientResponsible;
}

/**
 * Converts a backend Paciente domain entity to the frontend UI Patient view model.
 * View Model Adaptation: Computes age from birth date, formats guardian display, and maps clinical status.
 *
 * @param paciente - Raw Paciente entity received from backend REST API
 * @returns Formatted Patient view model ready for UI component rendering
 */
export function pacienteToPatient(paciente: Paciente): Patient {
  const responsaveisLista = Array.isArray(paciente.responsaveis) ? paciente.responsaveis : [];
  const responsavelPrincipal =
    responsaveisLista.find((r) => r.principal || r.tipo_responsavel === "principal") ||
    responsaveisLista[0];
  const responsavelExtra = responsaveisLista.find(
    (r) =>
      r.id !== responsavelPrincipal?.id &&
      (r.tipo_responsavel === "extra" || r.principal === false),
  );
  const dados = paciente.dados_clinicos;

  const birthDate = paciente.data_nascimento
    ? paciente.data_nascimento.split("-").reverse().join("/")
    : "";

  const anoNasc = paciente.data_nascimento
    ? parseInt(paciente.data_nascimento.split("-")[0] || "0", 10)
    : 0;
  const age = anoNasc > 1900 ? Math.max(0, new Date().getFullYear() - anoNasc) : 0;

  const sensorySensitivities = [
    ...(Array.isArray(dados?.gatilhos_sensoriais) ? dados.gatilhos_sensoriais : []),
    ...(paciente.gatilhos?.map((g) => g.gatilho?.nome || g.observacoes || "").filter(Boolean) || []),
  ];

  const condicaoClinica =
    dados?.diagnostico_base?.trim() ||
    paciente.estado_clinico?.trim() ||
    ESTADO_CLINICO_NAO_INFORMADO;

  const lastSessionDate = paciente.ultima_sessao_em
    ? new Date(paciente.ultima_sessao_em).toLocaleDateString("pt-BR")
    : ULTIMA_SESSAO_VAZIA;

  const mapearResponsavel = (resp?: Responsavel): PatientResponsible | undefined =>
    resp
      ? {
          name: resp.nome || "",
          birthDate: resp.data_nascimento ? resp.data_nascimento.split("-").reverse().join("/") : "",
          phone: resp.telefone || "",
          cpf: resp.cpf || "",
          address: resp.cep || resp.endereco || resp.cidade
            ? {
                cep: resp.cep || "",
                city: resp.cidade || "",
                state: resp.estado || "",
                street: resp.endereco || "",
                neighborhood: resp.bairro || "",
                number: resp.numero || "",
              }
            : undefined,
        }
      : undefined;

  return {
    id: paciente.id,
    name: paciente.nome,
    age,
    gender: "M",
    birthDate,
    photoUrl: paciente.foto_url || paciente.photoUrl || "",
    category: condicaoClinica,
    clinicalStatus: dados?.observacoes_gerais?.trim() || condicaoClinica,
    progress: paciente.status_ativo ? 50 : 100,
    performanceScore: undefined,
    lastSessionDate,
    status: paciente.status_ativo ? "IN_PROGRESS" : "FINISHED",
    statusAtivo: paciente.status_ativo !== false,
    clinicaId: paciente.clinica_id ?? null,
    responsibleName: responsavelPrincipal
      ? `${responsavelPrincipal.nome}${responsavelPrincipal.parentesco ? ` (${responsavelPrincipal.parentesco})` : ""}`
      : "Não informado",
    responsiblePhone: responsavelPrincipal?.telefone || paciente.telefone || "",
    therapist: paciente.terapeutas?.[0]?.terapeuta?.nome || "Não atribuído",
    communicationStyle: condicaoClinica,
    sensorySensitivities,
    notes: dados?.observacoes_gerais || "",
    phone: paciente.telefone || undefined,
    cpf: paciente.cpf || undefined,
    address: paciente.cep || paciente.endereco || paciente.cidade
      ? {
          cep: paciente.cep || "",
          city: paciente.cidade || "",
          state: paciente.estado || "",
          street: paciente.endereco || "",
          neighborhood: paciente.bairro || "",
          number: paciente.numero || "",
        }
      : undefined,
    responsible: mapearResponsavel(responsavelPrincipal),
    extraResponsible: mapearResponsavel(responsavelExtra),
  };
}


/**
 * ============================================================================
 * DTOs DE HISTORICO LONGITUDINAL E ENGAJAMENTO
 * Reexportacoes canonicas e envelopes REST da API
 * ============================================================================
 */
export type {
  MetricasEngajamentoGeral,
  PontoSerieMetrica,
  SerieMetricaJogo,
  MetricaManifestoJogo,
  ResumoJogoPaciente,
  SessaoHistoricoItem,
  HistoricoJogoDetalhado,
  HistoricoJogoCatalogo,
  HistoricoPorJogo,
  RespostaHistoricoPaciente,
  FiltrosHistorico,
  TipoMetricaCanonica,
} from "./historico.types";

import type { RespostaHistoricoPaciente, MetricasEngajamentoGeral, ResumoJogoPaciente } from "./historico.types";

export interface HistoricoRespostaApi {
  message?: string;
  data: RespostaHistoricoPaciente;
}

export interface HistoricoGeralRespostaApi {
  message?: string;
  data: {
    engajamento: MetricasEngajamentoGeral;
    jogos: ResumoJogoPaciente[];
    meta?: {
      total_jogos: number;
      periodo_analisado_dias: number;
      data_inicio?: string;
      data_fim?: string;
    };
  };
}

export interface HistoricoJogoRespostaApi {
  message?: string;
  data: {
    jogo: {
      id: string | number;
      nome: string;
      versao: string;
      slug?: string;
    };
    metricas_declaradas: Array<{
      id_metrica: string;
      tipo_metrica: string;
      unidade?: string;
      valores?: string[];
      nome?: string;
    }>;
    series_temporais: Array<unknown>;
    sessoes: Array<unknown>;
    meta?: Record<string, unknown>;
  };
}
