/**
 * ============================================================================
 * TIPAGENS CANÔNICAS DO DOMÍNIO PACIENTE (InTEA)
 * Conformidade: RF06, RF10, RF18, RF19, RN04 (Visibilidade), RN05 (Soft Delete)
 * Regra: TypeScript estrito sem o uso de `any`, snakes_case da API REST
 * ============================================================================
 */

export interface Responsavel {
  id: string;
  nome: string;
  cpf?: string | null;
  data_nascimento?: string | null;
  telefone: string;
  email?: string | null;
  parentesco?: string | null;
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

export interface TerapeutaVinculado {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  crp?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  status_ativo?: boolean;
}

export interface TerapeutaPaciente {
  terapeuta_id: string;
  paciente_id: string;
  created_at?: string;
  terapeuta?: TerapeutaVinculado;
}

/**
 * Entidade Canônica de Paciente mapeada no banco de dados Supabase e API REST.
 */
export interface Paciente {
  id: string; // UUID v4
  clinica_id: string; // UUID da clínica vinculada
  nome: string;
  data_nascimento: string; // ISO 8601 YYYY-MM-DD
  telefone?: string | null;
  cpf?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  status_ativo: boolean;
  created_at: string;
  updated_at: string;
  responsaveis?: Responsavel[];
  terapeutas?: TerapeutaPaciente[];
  dados_clinicos?: DadosClinicos | null;
  gatilhos?: PacienteGatilho[];
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CriarResponsavelDTO {
  nome: string;
  telefone: string;
  cpf?: string | null;
  email?: string | null;
  parentesco?: string | null;
}

export interface CriarDadosClinicosDTO {
  diagnostico_base: string;
  gatilhos_sensoriais?: string[];
  observacoes_gerais?: string;
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
  dados_clinicos?: CriarDadosClinicosDTO | null;
}

export interface AtualizarPacienteDTO {
  nome?: string;
  data_nascimento?: string;
  clinica_id?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  status_ativo?: boolean;
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
  data: Paciente;
  message?: string;
}

export interface PacientesListaRespostaApi {
  data: Paciente[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
  address?: PatientAddress;
  responsible?: PatientResponsible;
  extraResponsible?: PatientResponsible;
}

/**
 * Converte a entidade Paciente (modelo de API/banco) para o ViewModel Patient (modelo de UI).
 */
export function pacienteToPatient(paciente: Paciente): Patient {
  const responsavelPrincipal = paciente.responsaveis?.[0];
  const dados = paciente.dados_clinicos;

  const birthDate = paciente.data_nascimento
    ? paciente.data_nascimento.split("-").reverse().join("/")
    : "01/01/2019";

  const anoNasc = parseInt(paciente.data_nascimento?.split("-")[0] || "2019", 10);
  const age = Math.max(1, new Date().getFullYear() - anoNasc);

  const sensorySensitivities = [
    ...(dados?.gatilhos_sensoriais || []),
    ...(paciente.gatilhos?.map((g) => g.gatilho?.nome || g.observacoes || "").filter(Boolean) || []),
  ];

  return {
    id: paciente.id,
    name: paciente.nome,
    age,
    gender: "M",
    birthDate,
    photoUrl: "",
    category: dados?.diagnostico_base || "TEA Nível 1",
    clinicalStatus: dados?.observacoes_gerais || dados?.diagnostico_base || "Em acompanhamento clínico",
    progress: paciente.status_ativo ? 50 : 100,
    performanceScore: undefined,
    lastSessionDate: paciente.updated_at ? new Date(paciente.updated_at).toLocaleDateString("pt-BR") : "Recentemente",
    status: paciente.status_ativo ? "IN_PROGRESS" : "FINISHED",
    responsibleName: responsavelPrincipal ? `${responsavelPrincipal.nome} (${responsavelPrincipal.parentesco || "Responsável"})` : "Não informado",
    responsiblePhone: responsavelPrincipal?.telefone || paciente.telefone || "(Não informado)",
    therapist: paciente.terapeutas?.[0]?.terapeuta?.nome || "Dr. Marcos Vinicius",
    communicationStyle: "Em avaliação clínica",
    sensorySensitivities: sensorySensitivities.length > 0 ? sensorySensitivities : ["Nenhum gatilho severo relatado"],
    notes: dados?.observacoes_gerais || "Sem observações adicionais",
    phone: paciente.telefone || undefined,
    cpf: paciente.cpf || undefined,
    address: paciente.cep ? {
      cep: paciente.cep,
      city: paciente.cidade || "",
      state: paciente.estado || "",
      street: paciente.endereco || "",
      neighborhood: paciente.bairro || "",
      number: paciente.numero || "",
    } : undefined,
  };
}

