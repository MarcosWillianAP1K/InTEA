/**
 * ============================================================================
 * FIXTURES E MOCKS EM MEMÓRIA DO DOMÍNIO PACIENTE (bdmock.ts)
 * Dados clínicos e sociodemográficos realistas para desenvolvimento e testes.
 * Diagnósticos TEA com níveis de suporte 1, 2 e 3, responsáveis e gatilhos.
 * ============================================================================
 */

import type {
  Paciente,
  Responsavel,
  DadosClinicos,
  Gatilho,
  TerapeutaPaciente,
  CriarPacienteDTO,
  AtualizarPacienteDTO,
  FiltroPacienteDTO,
  Patient,
} from "./paciente.types";
import type {
  MetricasEngajamentoGeral,
  PontoSerieMetrica,
  SerieMetricaJogo,
  ResumoJogoPaciente,
  HistoricoJogoDetalhado,
  RespostaHistoricoPaciente,
} from "./historico.types";
import { MOCK_CLINICA, MOCK_TERAPEUTA_LOGADO } from "@/shared/types";

// ============================================================================
// FIXTURES DE GATILHOS
// ============================================================================

export const MOCK_GATILHOS: Gatilho[] = [
  {
    id: "g1111111-1111-4111-8111-111111111111",
    nome: "Sons Repentinos e Ruídos Agudos",
    categoria: "sensorial",
    descricao: "Reação a ruídos acima de 80dB, sinos, alarmes ou gritos",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "g2222222-2222-4222-8222-222222222222",
    nome: "Luzes Estroboscópicas e Luz Branca Fria",
    categoria: "sensorial",
    descricao: "Sensibilidade a luzes pulsantes ou sobrecarga luminosa",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "g3333333-3333-4333-8333-333333333333",
    nome: "Mudanças Bruscas de Rotina",
    categoria: "rotina",
    descricao: "Transição de atividades sem aviso visual ou contagem regressiva",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "g4444444-4444-4444-8444-444444444444",
    nome: "Toque Físico Inesperado",
    categoria: "sensorial",
    descricao: "Hipersensibilidade tátil a contatos físicos sem consentimento prévio",
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

// ============================================================================
// FIXTURES DE RESPONSÁVEIS
// ============================================================================

export const MOCK_RESPONSAVEIS: Responsavel[] = [
  {
    id: "e2b74052-16a3-4813-9f87-217bc3c02341",
    nome: "Juliana Silveira",
    cpf: "364.721.890-50",
    data_nascimento: "1988-04-12",
    telefone: "(11) 99887-6655",
    email: "juliana.silveira@email.com",
    parentesco: "Mãe",
    cep: "01310-100",
    cidade: "São Paulo",
    estado: "SP",
    endereco: "Avenida Paulista",
    bairro: "Bela Vista",
    numero: "1000",
    complemento: "Apto 42",
    created_at: "2026-01-10T09:00:00.000Z",
    updated_at: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    nome: "Mariana Santos",
    cpf: "987.654.321-12",
    data_nascimento: "1992-08-25",
    telefone: "(86) 98888-5555",
    email: "mariana.santos@email.com",
    parentesco: "Mãe",
    cep: "64049-550",
    cidade: "Teresina",
    estado: "PI",
    endereco: "Avenida Universitária",
    bairro: "Ininga",
    numero: "1200",
    complemento: "Bloco A",
    created_at: "2026-02-15T10:00:00.000Z",
    updated_at: "2026-02-15T10:00:00.000Z",
  },
  {
    id: "f5e4d3c2-b1a0-4987-9876-543210fedcba",
    nome: "Carlos Eduardo Oliveira",
    cpf: "712.345.980-22",
    data_nascimento: "1985-11-03",
    telefone: "(86) 98811-2233",
    email: "carlos.oliveira@email.com",
    parentesco: "Pai",
    cep: "64000-020",
    cidade: "Teresina",
    estado: "PI",
    endereco: "Rua Álvaro Mendes",
    bairro: "Centro",
    numero: "450",
    created_at: "2026-02-20T11:00:00.000Z",
    updated_at: "2026-02-20T11:00:00.000Z",
  },
];

// ============================================================================
// FIXTURES DE PACIENTES REALISTAS
// ============================================================================

export const MOCK_PACIENTE_PEDRO: Paciente = {
  id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  clinica_id: MOCK_CLINICA.id,
  nome: "Pedro Henrique Silveira",
  data_nascimento: "2018-06-15", // 8 anos em 2026
  telefone: "(11) 98765-4321",
  cpf: "529.982.247-25",
  cep: "01310-100",
  cidade: "São Paulo",
  estado: "SP",
  endereco: "Avenida Paulista",
  bairro: "Bela Vista",
  numero: "1000",
  complemento: "Apto 42",
  status_ativo: true,
  created_at: "2026-01-15T10:00:00.000Z",
  updated_at: "2026-01-15T10:00:00.000Z",
  responsaveis: [MOCK_RESPONSAVEIS[0]],
  dados_clinicos: {
    id: "dc-001",
    paciente_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    diagnostico_base:
      "TEA Nível 1 de suporte (comunicação verbal expressiva, hiperfoco em números e raciocínio sequencial)",
    gatilhos_sensoriais: [
      "Hipersensibilidade a sons repentinos",
      "Sensibilidade à luz branca forte",
    ],
    observacoes_gerais:
      "Excelente adesão a atividades de lógica matemática e pareamento visual. Boa tolerância a sessões de até 40 minutos.",
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
  },
  gatilhos: [
    {
      paciente_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      gatilho_id: MOCK_GATILHOS[0].id,
      grau_severidade: "moderado",
      observacoes: "Pode apresentar agitação motora transitória ao ouvir bipes agudos",
      gatilho: MOCK_GATILHOS[0],
    },
    {
      paciente_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      gatilho_id: MOCK_GATILHOS[1].id,
      grau_severidade: "leve",
      observacoes: "Prefere iluminação âmbar e telas com brilho reduzido",
      gatilho: MOCK_GATILHOS[1],
    },
  ],
  terapeutas: [
    {
      terapeuta_id: MOCK_TERAPEUTA_LOGADO.id,
      paciente_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      created_at: "2026-01-15T10:30:00.000Z",
      terapeuta: {
        id: MOCK_TERAPEUTA_LOGADO.id,
        nome: MOCK_TERAPEUTA_LOGADO.nome,
        email: MOCK_TERAPEUTA_LOGADO.email,
        telefone: MOCK_TERAPEUTA_LOGADO.telefone,
        crefito: MOCK_TERAPEUTA_LOGADO.crefito,
        registro_profissional: MOCK_TERAPEUTA_LOGADO.registro_profissional,
        especialidade: MOCK_TERAPEUTA_LOGADO.especialidade,
        status_ativo: true,
      },
    },
  ],
};

export const MOCK_PACIENTE_SOFIA: Paciente = {
  id: "e4f8d912-32a1-4bb6-9811-6677889900aa",
  clinica_id: MOCK_CLINICA.id,
  nome: "Sofia Helena Oliveira",
  data_nascimento: "2020-11-22", // 5 anos
  telefone: "(86) 98877-6655",
  cpf: "482.193.850-10",
  cep: "64000-020",
  cidade: "Teresina",
  estado: "PI",
  endereco: "Rua Álvaro Mendes",
  bairro: "Centro",
  numero: "450",
  status_ativo: true,
  created_at: "2026-02-01T14:30:00.000Z",
  updated_at: "2026-02-01T14:30:00.000Z",
  responsaveis: [MOCK_RESPONSAVEIS[2]],
  dados_clinicos: {
    id: "dc-002",
    paciente_id: "e4f8d912-32a1-4bb6-9811-6677889900aa",
    diagnostico_base:
      "TEA Nível 2 de suporte (comunicação funcional com apoio de PECS, estereotipias motoras de flapping)",
    gatilhos_sensoriais: [
      "Mudanças bruscas de rotina",
      "Estímulos visuais intermitentes",
    ],
    observacoes_gerais:
      "Necessita de pistas visuais concretas antes de transições de telas ou fases nos jogos.",
    created_at: "2026-02-01T14:30:00.000Z",
    updated_at: "2026-02-01T14:30:00.000Z",
  },
  gatilhos: [
    {
      paciente_id: "e4f8d912-32a1-4bb6-9811-6677889900aa",
      gatilho_id: MOCK_GATILHOS[2].id,
      grau_severidade: "severo",
      observacoes: "Requer aviso prévio de 2 minutos para encerramento de atividades",
      gatilho: MOCK_GATILHOS[2],
    },
  ],
  terapeutas: [
    {
      terapeuta_id: MOCK_TERAPEUTA_LOGADO.id,
      paciente_id: "e4f8d912-32a1-4bb6-9811-6677889900aa",
      created_at: "2026-02-01T15:00:00.000Z",
      terapeuta: {
        id: MOCK_TERAPEUTA_LOGADO.id,
        nome: MOCK_TERAPEUTA_LOGADO.nome,
        email: MOCK_TERAPEUTA_LOGADO.email,
        telefone: MOCK_TERAPEUTA_LOGADO.telefone,
        crefito: MOCK_TERAPEUTA_LOGADO.crefito,
        registro_profissional: MOCK_TERAPEUTA_LOGADO.registro_profissional,
        especialidade: MOCK_TERAPEUTA_LOGADO.especialidade,
        status_ativo: true,
      },
    },
  ],
};

export const MOCK_PACIENTE_LUCAS: Paciente = {
  id: "a1b2c3d4-e5f6-4a8b-8c0d-1e2f3a4b5c6d",
  clinica_id: MOCK_CLINICA.id,
  nome: "Lucas Gabriel Santos",
  data_nascimento: "2019-04-10", // 7 anos
  telefone: "(86) 99123-4567",
  cpf: "123.456.789-09",
  cep: "64049-550",
  cidade: "Teresina",
  estado: "PI",
  endereco: "Avenida Universitária",
  bairro: "Ininga",
  numero: "1200",
  status_ativo: true,
  created_at: "2026-03-10T09:15:00.000Z",
  updated_at: "2026-03-10T09:15:00.000Z",
  responsaveis: [MOCK_RESPONSAVEIS[1]],
  dados_clinicos: {
    id: "dc-003",
    paciente_id: "a1b2c3d4-e5f6-4a8b-8c0d-1e2f3a4b5c6d",
    diagnostico_base:
      "TEA Nível 3 de suporte (não verbal, suporte substancial contínuo, alta seletividade sensorial)",
    gatilhos_sensoriais: [
      "Toques corporais inesperados",
      "Luzes de alta frequência",
      "Sobrecarga sonora",
    ],
    observacoes_gerais:
      "Responde positivamente a estímulos sonoros harmoniosos em frequências graves e reforço visual imediato.",
    created_at: "2026-03-10T09:15:00.000Z",
    updated_at: "2026-03-10T09:15:00.000Z",
  },
  gatilhos: [
    {
      paciente_id: "a1b2c3d4-e5f6-4a8b-8c0d-1e2f3a4b5c6d",
      gatilho_id: MOCK_GATILHOS[3].id,
      grau_severidade: "severo",
      observacoes: "Evitar estímulos vibratórios intensos no controle",
      gatilho: MOCK_GATILHOS[3],
    },
  ],
  terapeutas: [
    {
      terapeuta_id: MOCK_TERAPEUTA_LOGADO.id,
      paciente_id: "a1b2c3d4-e5f6-4a8b-8c0d-1e2f3a4b5c6d",
      created_at: "2026-03-10T09:30:00.000Z",
      terapeuta: {
        id: MOCK_TERAPEUTA_LOGADO.id,
        nome: MOCK_TERAPEUTA_LOGADO.nome,
        email: MOCK_TERAPEUTA_LOGADO.email,
        telefone: MOCK_TERAPEUTA_LOGADO.telefone,
        crefito: MOCK_TERAPEUTA_LOGADO.crefito,
        registro_profissional: MOCK_TERAPEUTA_LOGADO.registro_profissional,
        especialidade: MOCK_TERAPEUTA_LOGADO.especialidade,
        status_ativo: true,
      },
    },
  ],
};

export const MOCK_PACIENTE_INATIVO: Paciente = {
  id: "f9999999-9999-4999-8999-999999999999",
  clinica_id: MOCK_CLINICA.id,
  nome: "Enzo Gabriel Inativo",
  data_nascimento: "2017-01-20",
  telefone: "(86) 99999-0000",
  cpf: "999.888.777-66",
  cep: "64000-000",
  cidade: "Teresina",
  estado: "PI",
  endereco: "Rua das Flores",
  bairro: "Centro",
  numero: "100",
  status_ativo: false, // Inativado por soft delete (RN05)
  created_at: "2025-10-01T08:00:00.000Z",
  updated_at: "2026-01-05T12:00:00.000Z",
  responsaveis: [],
  dados_clinicos: {
    id: "dc-004",
    paciente_id: "f9999999-9999-4999-8999-999999999999",
    diagnostico_base: "TEA Nível 1 de suporte",
    gatilhos_sensoriais: [],
  },
  gatilhos: [],
  terapeutas: [],
};

export const FIXTURES_PACIENTES: Paciente[] = [
  MOCK_PACIENTE_PEDRO,
  MOCK_PACIENTE_SOFIA,
  MOCK_PACIENTE_LUCAS,
  MOCK_PACIENTE_INATIVO,
];

// ============================================================================
// ESTADO EM MEMÓRIA (MUTÁVEL NOS TESTES / FALLBACKS)
// ============================================================================

let pacientesMock: Paciente[] = JSON.parse(JSON.stringify(FIXTURES_PACIENTES));

/**
 * Reseta o repositório em memória para as fixtures iniciais.
 */
export function resetarPacientesMock(): void {
  pacientesMock = JSON.parse(JSON.stringify(FIXTURES_PACIENTES));
}

function calcularIdade(dataNascimento: string): number {
  const hoje = new Date();
  const partes = dataNascimento.split("-").map(Number);
  const ano = partes[0];
  const mes = partes[1] || 1;
  const dia = partes[2] || 1;

  let idade = hoje.getFullYear() - ano;
  const mesAtual = hoje.getMonth() + 1;
  if (mesAtual < mes || (mesAtual === mes && hoje.getDate() < dia)) {
    idade--;
  }
  return idade;
}

// ============================================================================
// HELPERS EM MEMÓRIA
// ============================================================================

/**
 * Lista pacientes simulados em memória aplicando filtros clínicos e de paginação.
 */
export async function listarPacientesMock(
  filtros?: FiltroPacienteDTO,
): Promise<Paciente[]> {
  let resultado = [...pacientesMock];

  if (!filtros?.incluirInativos) {
    resultado = resultado.filter((p) => p.status_ativo);
  }

  if (filtros?.nome) {
    const termo = filtros.nome.toLowerCase().trim();
    resultado = resultado.filter((p) => p.nome.toLowerCase().includes(termo));
  }

  if (filtros?.cpf) {
    const cpfLimpo = filtros.cpf.replace(/\D/g, "");
    resultado = resultado.filter((p) =>
      p.cpf ? p.cpf.replace(/\D/g, "").includes(cpfLimpo) : false,
    );
  }

  if (filtros?.idadeMin !== undefined) {
    resultado = resultado.filter(
      (p) => calcularIdade(p.data_nascimento) >= (filtros.idadeMin ?? 0),
    );
  }

  if (filtros?.idadeMax !== undefined) {
    resultado = resultado.filter(
      (p) => calcularIdade(p.data_nascimento) <= (filtros.idadeMax ?? 99),
    );
  }

  if (filtros?.page && filtros?.limit) {
    const inicio = (filtros.page - 1) * filtros.limit;
    resultado = resultado.slice(inicio, inicio + filtros.limit);
  }

  return JSON.parse(JSON.stringify(resultado));
}

/**
 * Consulta um paciente por UUID no armazenamento em memória.
 */
export async function buscarPacienteMockPorId(
  id: string,
): Promise<Paciente | null> {
  const encontrado = pacientesMock.find((p) => p.id === id);
  return encontrado ? JSON.parse(JSON.stringify(encontrado)) : null;
}

/**
 * Cadastra um novo paciente no mock em memória com UUID v4 gerado.
 */
export async function criarPacienteMock(
  dto: CriarPacienteDTO,
): Promise<Paciente> {
  const novoId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `pac-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const agora = new Date().toISOString();

  const novoResponsavel: Responsavel | undefined = dto.responsavel
    ? {
        id: `resp-${Date.now()}`,
        nome: dto.responsavel.nome,
        telefone: dto.responsavel.telefone,
        cpf: dto.responsavel.cpf ?? null,
        email: dto.responsavel.email ?? null,
        parentesco: dto.responsavel.parentesco ?? "Responsável",
        created_at: agora,
        updated_at: agora,
      }
    : undefined;

  const novosDadosClinicos: DadosClinicos | undefined = dto.dados_clinicos
    ? {
        id: `dc-${Date.now()}`,
        paciente_id: novoId,
        diagnostico_base: dto.dados_clinicos.diagnostico_base,
        gatilhos_sensoriais: dto.dados_clinicos.gatilhos_sensoriais ?? [],
        observacoes_gerais: dto.dados_clinicos.observacoes_gerais ?? null,
        created_at: agora,
        updated_at: agora,
      }
    : undefined;

  const novoPaciente: Paciente = {
    id: novoId,
    clinica_id: dto.clinica_id || MOCK_CLINICA.id,
    nome: dto.nome,
    data_nascimento: dto.data_nascimento,
    cpf: dto.cpf,
    telefone: dto.telefone ?? null,
    cep: dto.cep ?? null,
    cidade: dto.cidade ?? null,
    estado: dto.estado ?? null,
    endereco: dto.endereco ?? null,
    bairro: dto.bairro ?? null,
    numero: dto.numero ?? null,
    complemento: dto.complemento ?? null,
    status_ativo: true,
    created_at: agora,
    updated_at: agora,
    responsaveis: novoResponsavel ? [novoResponsavel] : [],
    dados_clinicos: novosDadosClinicos ?? null,
    gatilhos: [],
    terapeutas: [],
  };

  pacientesMock.push(novoPaciente);
  return JSON.parse(JSON.stringify(novoPaciente));
}

/**
 * Atualiza campos de um paciente no mock em memória.
 */
export async function atualizarPacienteMock(
  id: string,
  dto: AtualizarPacienteDTO,
): Promise<Paciente | null> {
  const index = pacientesMock.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const pacienteExistente = pacientesMock[index];
  const atualizado: Paciente = {
    ...pacienteExistente,
    ...(dto.nome !== undefined && { nome: dto.nome }),
    ...(dto.data_nascimento !== undefined && {
      data_nascimento: dto.data_nascimento,
    }),
    ...(dto.clinica_id !== undefined && { clinica_id: dto.clinica_id || MOCK_CLINICA.id }),
    ...(dto.telefone !== undefined && { telefone: dto.telefone }),
    ...(dto.cpf !== undefined && { cpf: dto.cpf }),
    ...(dto.cep !== undefined && { cep: dto.cep }),
    ...(dto.cidade !== undefined && { cidade: dto.cidade }),
    ...(dto.estado !== undefined && { estado: dto.estado }),
    ...(dto.endereco !== undefined && { endereco: dto.endereco }),
    ...(dto.bairro !== undefined && { bairro: dto.bairro }),
    ...(dto.numero !== undefined && { numero: dto.numero }),
    ...(dto.complemento !== undefined && { complemento: dto.complemento }),
    ...(dto.status_ativo !== undefined && { status_ativo: dto.status_ativo }),
    updated_at: new Date().toISOString(),
  };

  pacientesMock[index] = atualizado;
  return JSON.parse(JSON.stringify(atualizado));
}

/**
 * Desativa o paciente em memória aplicando soft delete (RN05).
 */
export async function inativarPacienteMock(id: string): Promise<Paciente | null> {
  return atualizarPacienteMock(id, { status_ativo: false });
}

/**
 * Reativa um paciente inativo no mock em memória.
 */
export async function reativarPacienteMock(id: string): Promise<Paciente | null> {
  return atualizarPacienteMock(id, { status_ativo: true });
}

/**
 * Lista terapeutas vinculados a um paciente no mock em memória.
 */
export async function listarTerapeutasPacienteMock(
  pacienteId: string,
): Promise<TerapeutaPaciente[]> {
  const paciente = pacientesMock.find((p) => p.id === pacienteId);
  if (!paciente) return [];
  return JSON.parse(JSON.stringify(paciente.terapeutas ?? []));
}

/**
 * Vincula um terapeuta a um paciente no mock em memória.
 */
export async function vincularTerapeutaMock(
  pacienteId: string,
  terapeutaId: string,
): Promise<{ message: string }> {
  const paciente = pacientesMock.find((p) => p.id === pacienteId);
  if (!paciente) {
    throw new Error("Paciente não encontrado para vinculação.");
  }

  paciente.terapeutas = paciente.terapeutas ?? [];
  const jaVinculado = paciente.terapeutas.some(
    (t) => t.terapeuta_id === terapeutaId,
  );

  if (!jaVinculado) {
    paciente.terapeutas.push({
      paciente_id: pacienteId,
      terapeuta_id: terapeutaId,
      created_at: new Date().toISOString(),
      terapeuta: {
        id: terapeutaId,
        nome: "Terapeuta Vinculado",
        status_ativo: true,
      },
    });
  }

  return { message: "Terapeuta vinculado ao paciente com sucesso." };
}

/**
 * Desvincula um terapeuta de um paciente no mock em memória.
 */
export async function desvincularTerapeutaMock(
  pacienteId: string,
  terapeutaId: string,
): Promise<{ message: string }> {
  const paciente = pacientesMock.find((p) => p.id === pacienteId);
  if (!paciente) {
    throw new Error("Paciente não encontrado para desvinculação.");
  }

  paciente.terapeutas = (paciente.terapeutas ?? []).filter(
    (t) => t.terapeuta_id !== terapeutaId,
  );

  return {
    message: "Vínculo do terapeuta com o paciente removido com sucesso.",
  };
}

// ============================================================================
// FIXTURES DE APRESENTAÇÃO (UI / VIEWMODEL MOCKS)
// Centralizados para uso no store de pacientes, formulários e listagens visuais.
// ============================================================================

export const DEFAULT_TRIGGERS: string[] = [
  "Som Alto",
  "Brilho Intenso",
  "Interações Sociais",
  "Texturas Pastosas",
  "Mudança de Rotina",
  "Aglomerações",
  "Toque Leve",
  "Odores Fortes",
];

export const AVATAR_PLACEHOLDERS: string[] = [
  "https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1595454223600-91fbdd77ae09?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1517677129300-07b130802f46?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
];

export const PATIENTS_DICTIONARY: Record<string, Patient> = {
  "pac-001": {
    id: "pac-001",
    name: "Lucas Gabriel Silva",
    age: 7,
    gender: "M",
    birthDate: "14/05/2019",
    photoUrl:
      "https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 1",
    clinicalStatus:
      "Comunicação verbal fluente, hiperfoco em matemática e números",
    progress: 33,
    performanceScore: 33,
    lastSessionDate: "08/09, 14:08",
    status: "IN_PROGRESS",
    responsibleName: "Mariana Silva (Mãe)",
    responsiblePhone: "(11) 98765-4321",
    therapist: "Dr. Hermeson Dantas",
    communicationStyle:
      "Verbal expressivo com vocabulário rico; mediação social indicada",
    sensorySensitivities: [
      "Hipersensibilidade a sons repentinos",
      "Sensibilidade à luz branca forte",
    ],
    notes:
      "Excelente adesão a atividades de raciocínio sequencial e jogos de tabuleiro adaptados.",
  },
  "pac-002": {
    id: "pac-002",
    name: "Sofia Helena Oliveira",
    age: 5,
    gender: "F",
    birthDate: "22/11/2020",
    photoUrl:
      "https://images.unsplash.com/photo-1595454223600-91fbdd77ae09?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 2",
    clinicalStatus: "Comunicação com suporte de PECS e gestos funcionais",
    progress: 100,
    performanceScore: 20,
    lastSessionDate: "03/09, 14:32",
    status: "FINISHED",
    responsibleName: "Renata Oliveira (Mãe)",
    responsiblePhone: "(11) 97654-3210",
    therapist: "Dra. Carolina Freitas",
    communicationStyle:
      "Comunicação Aumentativa e Alternativa (CAA), frases curtas",
    sensorySensitivities: [
      "Aversão a texturas pegajosas",
      "Busca de pressão proprioceptiva",
    ],
    notes:
      "Sessão concluída com alcance de metas em reconhecimento de emoções básicas.",
  },
  "pac-003": {
    id: "pac-003",
    name: "Enzo Gabriel Santos",
    age: 9,
    gender: "M",
    birthDate: "03/03/2017",
    photoUrl:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 1",
    clinicalStatus:
      "Desenvolvimento escolar ativo, rigidez cognitiva e transições moderadas",
    progress: 100,
    performanceScore: 10,
    lastSessionDate: "02/09, 15:28",
    status: "FINISHED",
    responsibleName: "Carlos Eduardo Santos (Pai)",
    responsiblePhone: "(21) 99123-4567",
    therapist: "Dr. Hermeson Dantas",
    communicationStyle: "Verbal com necessidade de pistas visuais de transição",
    sensorySensitivities: ["Sensibilidade olfativa"],
    notes: "Módulo de flexibilidade cognitiva completado com sucesso.",
  },
  "pac-004": {
    id: "pac-004",
    name: "Beatriz Lima Costa",
    age: 8,
    gender: "F",
    birthDate: "10/08/2018",
    photoUrl:
      "https://images.unsplash.com/photo-1517677129300-07b130802f46?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 3",
    clinicalStatus:
      "Comunicação não-verbal com prancha digital, necessidade de suporte substancial",
    progress: 100,
    performanceScore: 23,
    lastSessionDate: "27/08, 16:59",
    status: "FINISHED",
    responsibleName: "Juliana Costa (Mãe)",
    responsiblePhone: "(31) 98456-7890",
    therapist: "Dra. Beatriz Albuquerque",
    communicationStyle:
      "Não-verbal; utiliza tablet adaptado e comunicação por símbolos",
    sensorySensitivities: [
      "Sobrecarga sensorial auditiva em locais cheios",
      "Gosta de balanço vestibular",
    ],
    notes: "Grande engajamento em atividades com retorno audiovisual lúdico.",
  },
  "pac-005": {
    id: "pac-005",
    name: "Mateus Henrique Pereira",
    age: 6,
    gender: "M",
    birthDate: "30/01/2020",
    photoUrl:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 2",
    clinicalStatus:
      "Ecolalia funcional, processo de dessensibilização e contato visual",
    progress: 100,
    performanceScore: 20,
    lastSessionDate: "22/08, 16:16",
    status: "FINISHED",
    responsibleName: "Fernanda Pereira (Mãe)",
    responsiblePhone: "(41) 99876-5432",
    therapist: "Dr. Marcos Vinicius",
    communicationStyle: "Ecolalia com intenção comunicativa",
    sensorySensitivities: ["Hipersensibilidade ao toque leve"],
    notes: "Avanço no tempo de atenção compartilhada em jogos de pares.",
  },
  "pac-006": {
    id: "pac-006",
    name: "Alice Moreira Rodrigues",
    age: 11,
    gender: "F",
    birthDate: "19/04/2015",
    photoUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
    category: "TEA Nível 1",
    clinicalStatus:
      "Habilidades socioemocionais em desenvolvimento e reciprocidade social",
    progress: 65,
    performanceScore: 78,
    lastSessionDate: "16/08, 11:30",
    status: "IN_PROGRESS",
    responsibleName: "Patrícia Rodrigues (Mãe)",
    responsiblePhone: "(51) 99345-6789",
    therapist: "Dr. Hermeson Dantas",
    communicationStyle: "Fluente, com foco em treino de reciprocidade social",
    sensorySensitivities: ["Nenhuma sensibilidade severa"],
    notes:
      "Boa capacidade de autorreflexão e interesse nas narrativas dos jogos.",
  },
  "pac-007": {
    id: "pac-007",
    name: "Pedro Arthur Mendes",
    age: 4,
    gender: "M",
    birthDate: "05/09/2022",
    photoUrl:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
    category: "Em Avaliação",
    clinicalStatus:
      "Sinais precoces de atraso no desenvolvimento da fala e interação social",
    progress: 25,
    performanceScore: 40,
    lastSessionDate: "12/08, 09:15",
    status: "IN_PROGRESS",
    responsibleName: "Cláudia Mendes (Mãe)",
    responsiblePhone: "(71) 98877-6655",
    therapist: "Dra. Carolina Freitas",
    communicationStyle: "Gestual e balbucio com intenção comunicativa",
    sensorySensitivities: ["Fixação em estímulos visuais rotatórios"],
    notes:
      "Primeiras avaliações de resposta a estímulos lúdicos e contato visual.",
  },
};

// ============================================================================
// FIXTURES DE HISTÓRICO LONGITUDINAL E ENGAJAMENTO (Sprint 11)
// RF15, RF19, RN01, RN02, RN04, RN05
// ============================================================================

export const MOCK_HISTORICO_ENGAJAMENTO_GERAL: MetricasEngajamentoGeral = {
  total_sessoes: 12,
  total_iniciadas: 12,
  sessoes_finalizadas: 10,
  sessoes_interrompidas: 2,
  taxa_conclusao_porcentagem: 83.3,
  taxa_conclusao: 83.3,
  tempo_total_segundos: 16200, // 4 horas e 30 minutos
  tempo_medio_segundos: 1350, // 22 minutos e 30 segundos
};

export const MOCK_HISTORICO_ENGAJAMENTO_BAIXA_ADESAO: MetricasEngajamentoGeral = {
  total_sessoes: 10,
  total_iniciadas: 10,
  sessoes_finalizadas: 6,
  sessoes_interrompidas: 4,
  taxa_conclusao_porcentagem: 60.0,
  taxa_conclusao: 60.0,
  tempo_total_segundos: 7200, // 2 horas
  tempo_medio_segundos: 720, // 12 minutos
};

export const MOCK_SERIE_NUMERICA: SerieMetricaJogo = {
  id_metrica: "tempo_reacao_ms",
  nome_metrica: "Tempo de Reação Motora",
  tipo_metrica: "numerica",
  unidade: "ms",
  descricao: "Tempo médio de resposta motora aos estímulos visuais na tela",
  meta: {
    valor_min: 200,
    valor_max: 1200,
    valor_alvo: 450,
    inverter_escala: true,
  },
  pontos: [
    {
      sessao_id: "sess-01",
      data_hora: "2026-10-01T14:30:00Z",
      valor: 850,
      tendencia: "queda",
      rotulo: "Sessão 1",
    },
    {
      sessao_id: "sess-02",
      data_hora: "2026-10-05T14:30:00Z",
      valor: 720,
      tendencia: "queda",
      rotulo: "Sessão 2",
    },
    {
      sessao_id: "sess-03",
      data_hora: "2026-10-09T14:30:00Z",
      valor: 680,
      tendencia: "estavel",
      rotulo: "Sessão 3",
    },
    {
      sessao_id: "sess-04",
      data_hora: "2026-10-14T14:30:00Z",
      valor: 540,
      tendencia: "queda",
      rotulo: "Sessão 4",
    },
    {
      sessao_id: "sess-05",
      data_hora: "2026-10-18T14:30:00Z",
      valor: 460,
      tendencia: "queda",
      rotulo: "Sessão 5",
    },
  ],
};

export const MOCK_SERIE_CATEGORICA: SerieMetricaJogo = {
  id_metrica: "nivel_atencao",
  nome_metrica: "Nível de Atenção Sustentada",
  tipo_metrica: "categorica",
  valores: ["Disperso", "Parcial", "Focado"],
  descricao: "Classificação da estabilidade atencional durante a partida",
  pontos: [
    {
      sessao_id: "sess-01",
      data_hora: "2026-10-01T14:30:00Z",
      valor: "Disperso",
      rotulo: "Sessão 1",
    },
    {
      sessao_id: "sess-02",
      data_hora: "2026-10-05T14:30:00Z",
      valor: "Parcial",
      rotulo: "Sessão 2",
    },
    {
      sessao_id: "sess-03",
      data_hora: "2026-10-09T14:30:00Z",
      valor: "Parcial",
      rotulo: "Sessão 3",
    },
    {
      sessao_id: "sess-04",
      data_hora: "2026-10-14T14:30:00Z",
      valor: "Focado",
      rotulo: "Sessão 4",
    },
    {
      sessao_id: "sess-05",
      data_hora: "2026-10-18T14:30:00Z",
      valor: "Focado",
      rotulo: "Sessão 5",
    },
  ],
};

export const MOCK_SERIE_ORDINAL: SerieMetricaJogo = {
  id_metrica: "estagio_desafio",
  nome_metrica: "Estágio de Desafio Alcançado",
  tipo_metrica: "ordinal",
  valores: ["Fase 1", "Fase 2", "Fase 3", "Fase 4"],
  descricao: "Grau de progressão conquistado nas fases do jogo terapêutico",
  pontos: [
    {
      sessao_id: "sess-01",
      data_hora: "2026-10-01T14:30:00Z",
      valor: "Fase 1",
      rotulo: "Sessão 1",
    },
    {
      sessao_id: "sess-02",
      data_hora: "2026-10-05T14:30:00Z",
      valor: "Fase 2",
      rotulo: "Sessão 2",
    },
    {
      sessao_id: "sess-03",
      data_hora: "2026-10-09T14:30:00Z",
      valor: "Fase 2",
      rotulo: "Sessão 3",
    },
    {
      sessao_id: "sess-04",
      data_hora: "2026-10-14T14:30:00Z",
      valor: "Fase 3",
      rotulo: "Sessão 4",
    },
    {
      sessao_id: "sess-05",
      data_hora: "2026-10-18T14:30:00Z",
      valor: "Fase 4",
      rotulo: "Sessão 5",
    },
  ],
};

export const MOCK_SERIE_BOOLEANA: SerieMetricaJogo = {
  id_metrica: "concluiu_sem_ajuda",
  nome_metrica: "Autonomia na Resolução",
  tipo_metrica: "booleana",
  descricao: "Indica se o paciente completou o desafio sem intervenção física ou verbal do terapeuta",
  pontos: [
    {
      sessao_id: "sess-01",
      data_hora: "2026-10-01T14:30:00Z",
      valor: false,
      rotulo: "Sessão 1",
    },
    {
      sessao_id: "sess-02",
      data_hora: "2026-10-05T14:30:00Z",
      valor: false,
      rotulo: "Sessão 2",
    },
    {
      sessao_id: "sess-03",
      data_hora: "2026-10-09T14:30:00Z",
      valor: true,
      rotulo: "Sessão 3",
    },
    {
      sessao_id: "sess-04",
      data_hora: "2026-10-14T14:30:00Z",
      valor: true,
      rotulo: "Sessão 4",
    },
    {
      sessao_id: "sess-05",
      data_hora: "2026-10-18T14:30:00Z",
      valor: true,
      rotulo: "Sessão 5",
    },
  ],
};

/**
 * Fixture de teste para validar violação estrita da RN02:
 * Métrica sem tipo ou com tipo não homologado no manifesto.
 */
export const MOCK_SERIE_INVALIDA_RN02: SerieMetricaJogo = {
  id_metrica: "metrica_sem_tipo_rn02",
  nome_metrica: "Métrica Inconforme Sem Tipo",
  tipo_metrica: "tipo_inexistente_nao_homologado",
  pontos: [
    {
      sessao_id: "sess-01",
      data_hora: "2026-10-01T14:30:00Z",
      valor: 999,
      rotulo: "Sessão 1",
    },
  ],
};

export const MOCK_CATALOGO_JOGOS_PACIENTE: ResumoJogoPaciente[] = [
  {
    id: "jogo-floresta-01",
    nome: "Aventuras na Floresta",
    versao: "1.2.0",
    total_sessoes: 5,
    data_ultima_sessao: "2026-10-18T14:30:00Z",
    icone: "Gamepad2",
  },
  {
    id: "jogo-ritmos-02",
    nome: "Cores e Ritmos",
    versao: "2.0.1",
    total_sessoes: 5,
    data_ultima_sessao: "2026-10-15T10:15:00Z",
    icone: "Sparkles",
  },
];

export const MOCK_HISTORICO_JOGO_COMPLETO: HistoricoJogoDetalhado = {
  tipo: "detalhado",
  jogo: {
    id: "jogo-floresta-01",
    nome: "Aventuras na Floresta",
    versao: "1.2.0",
    metricas_suportadas: [
      {
        id_metrica: "tempo_reacao_ms",
        tipo_metrica: "numerica",
        unidade: "ms",
        nome: "Tempo de Reação Motora",
      },
      {
        id_metrica: "nivel_atencao",
        tipo_metrica: "categorica",
        valores: ["Disperso", "Parcial", "Focado"],
        nome: "Nível de Atenção Sustentada",
      },
      {
        id_metrica: "estagio_desafio",
        tipo_metrica: "ordinal",
        valores: ["Fase 1", "Fase 2", "Fase 3", "Fase 4"],
        nome: "Estágio de Desafio Alcançado",
      },
      {
        id_metrica: "concluiu_sem_ajuda",
        tipo_metrica: "booleana",
        nome: "Autonomia na Resolução",
      },
    ],
  },
  sessoes: [
    {
      sessao_id: "sess-01",
      status_sessao: "finalizada",
      data_hora_fim: "2026-10-01T15:00:00Z",
      tempo_total_segundos: 1200,
    },
    {
      sessao_id: "sess-02",
      status_sessao: "finalizada",
      data_hora_fim: "2026-10-05T15:00:00Z",
      tempo_total_segundos: 1350,
    },
    {
      sessao_id: "sess-03",
      status_sessao: "finalizada",
      data_hora_fim: "2026-10-09T15:00:00Z",
      tempo_total_segundos: 1400,
    },
    {
      sessao_id: "sess-04",
      status_sessao: "finalizada",
      data_hora_fim: "2026-10-14T15:00:00Z",
      tempo_total_segundos: 1100,
    },
    {
      sessao_id: "sess-05",
      status_sessao: "finalizada",
      data_hora_fim: "2026-10-18T15:00:00Z",
      tempo_total_segundos: 1500,
    },
  ],
  series_temporais: [
    MOCK_SERIE_NUMERICA,
    MOCK_SERIE_CATEGORICA,
    MOCK_SERIE_ORDINAL,
    MOCK_SERIE_BOOLEANA,
  ],
  paginacao: {
    page: 1,
    limit: 10,
    total_registros: 5,
  },
};

export const MOCK_RESPOSTA_HISTORICO_PACIENTE: RespostaHistoricoPaciente = {
  paciente_id: "pac-001",
  engajamento_geral: MOCK_HISTORICO_ENGAJAMENTO_GERAL,
  historico_por_jogo: MOCK_HISTORICO_JOGO_COMPLETO,
};


