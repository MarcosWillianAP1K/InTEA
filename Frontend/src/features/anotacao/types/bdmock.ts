/**
 * ============================================================================
 * CLINICAL NOTES DOMAIN IN-MEMORY FIXTURES AND MOCKS
 * Compliance: RF16, RF21, RN04, RN05.
 * ============================================================================
 */

import type {
  AnotacaoClinica,
  CriarAnotacaoDTO,
  AtualizarAnotacaoDTO,
  FiltroAnotacaoDTO,
} from "./anotacao.types";

export const MOCK_ANOTACAO_1: AnotacaoClinica = {
  id: "11111111-aaaa-4111-8111-111111111111",
  terapeuta_id: "b3333333-3333-4333-8333-333333333333",
  paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  sessao_id: "uuid-sessao-1",
  conteudo:
    "Paciente demonstrou excelente sustentação atencional no jogo Aventura das Cores, mantendo autorregulação sensorial durante a intervenção.",
  soft_delete: false,
  status_ativo: true,
  terapeuta_nome: "Dra. Luma Maiara",
  paciente_nome: "Lucas Gabriel Silveira",
  created_at: "2026-10-17T18:25:00.000Z",
  updated_at: "2026-10-17T18:25:00.000Z",
  autor: {
    id: "b3333333-3333-4333-8333-333333333333",
    nome: "Dra. Luma Maiara",
    registro_profissional: "CREFITO 12345-TO",
    crefito: "12345-TO",
    especialidade: "Terapia Ocupacional e Integração Sensorial",
  },
};

export const MOCK_ANOTACAO_2: AnotacaoClinica = {
  id: "22222222-bbbb-4222-8222-222222222222",
  terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
  paciente_id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  sessao_id: null,
  conteudo:
    "Avaliação clínica inicial: paciente apresenta hipersensibilidade a ruídos repentinos. Recomendado iniciar sessões com feedback auditivo suavizado.",
  soft_delete: false,
  status_ativo: true,
  terapeuta_nome: "Dr. Marcos Terapeuta",
  paciente_nome: "Sofia Costa Santos",
  created_at: "2026-10-16T14:30:00.000Z",
  updated_at: "2026-10-16T14:30:00.000Z",
  autor: {
    id: "a9849163-613f-4492-90cf-89985902d16e",
    nome: "Dr. Marcos Terapeuta",
    registro_profissional: "CRP 11/04589",
    especialidade: "Neuropsicologia Clínica",
  },
};

export const MOCK_ANOTACAO_3: AnotacaoClinica = {
  id: "33333333-cccc-4333-8333-333333333333",
  terapeuta_id: "c4444444-4444-4444-8444-444444444444",
  paciente_id: "d4e5f6a7-b8c9-0123-def1-234567890123",
  sessao_id: "uuid-sessao-2",
  conteudo:
    "Evolução motora consistente. O paciente conseguiu completar os ciclos de pareamento com latência média inferior a 800ms.",
  soft_delete: false,
  status_ativo: true,
  terapeuta_nome: "Dr. Hermeson Alves",
  paciente_nome: "Enzo Gabriel Oliveira",
  created_at: "2026-10-15T10:15:00.000Z",
  updated_at: "2026-10-15T10:15:00.000Z",
  autor: {
    id: "c4444444-4444-4444-8444-444444444444",
    nome: "Dr. Hermeson Alves",
    registro_profissional: "CREFITO 98765-F",
    crefito: "98765-F",
    especialidade: "Fisioterapia Neurofuncional",
  },
};

export const MOCK_ANOTACAO_INATIVA: AnotacaoClinica = {
  id: "44444444-dddd-4444-8444-444444444444",
  terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
  paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  sessao_id: null,
  conteudo: "Rascunho de anotação cancelada por duplicidade.",
  soft_delete: true,
  status_ativo: false,
  terapeuta_nome: "Dr. Marcos Terapeuta",
  paciente_nome: "Lucas Gabriel Silveira",
  created_at: "2026-10-10T09:00:00.000Z",
  updated_at: "2026-10-10T09:10:00.000Z",
  autor: {
    id: "a9849163-613f-4492-90cf-89985902d16e",
    nome: "Dr. Marcos Terapeuta",
    registro_profissional: "CRP 11/04589",
    especialidade: "Neuropsicologia Clínica",
  },
};

export const FIXTURES_ANOTACOES: AnotacaoClinica[] = [
  MOCK_ANOTACAO_1,
  MOCK_ANOTACAO_2,
  MOCK_ANOTACAO_3,
  MOCK_ANOTACAO_INATIVA,
];

let anotacoesMockState: AnotacaoClinica[] = JSON.parse(
  JSON.stringify(FIXTURES_ANOTACOES),
);

export function resetarAnotacoesMock(): void {
  anotacoesMockState = JSON.parse(JSON.stringify(FIXTURES_ANOTACOES));
}

/**
 * Lists clinical annotations supporting filtering by patient, session, and status (RN05).
 */
export async function listarAnotacoesMock(
  filtroOuPacienteId?: string | FiltroAnotacaoDTO,
): Promise<AnotacaoClinica[]> {
  const filtro: FiltroAnotacaoDTO =
    typeof filtroOuPacienteId === "string"
      ? { paciente_id: filtroOuPacienteId }
      : filtroOuPacienteId || {};

  let lista = [...anotacoesMockState];

  if (filtro.paciente_id) {
    lista = lista.filter((a) => a.paciente_id === filtro.paciente_id);
  }

  if (filtro.sessao_id !== undefined) {
    lista = lista.filter((a) => a.sessao_id === filtro.sessao_id);
  }

  if (filtro.terapeutaId) {
    lista = lista.filter((a) => a.terapeuta_id === filtro.terapeutaId);
  }

  if (filtro.busca && filtro.busca.trim()) {
    const termo = filtro.busca.toLowerCase().trim();
    lista = lista.filter(
      (a) =>
        a.conteudo.toLowerCase().includes(termo) ||
        (a.autor?.nome && a.autor.nome.toLowerCase().includes(termo)) ||
        (a.terapeuta_nome && a.terapeuta_nome.toLowerCase().includes(termo)),
    );
  }

  if (filtro.dataInicio) {
    const tInicio = new Date(filtro.dataInicio).getTime();
    lista = lista.filter((a) => (a.created_at ? new Date(a.created_at).getTime() >= tInicio : true));
  }

  if (filtro.dataFim) {
    const tFim = new Date(filtro.dataFim).getTime();
    lista = lista.filter((a) => (a.created_at ? new Date(a.created_at).getTime() <= tFim : true));
  }

  if (filtro.somenteSemSessao) {
    lista = lista.filter((a) => a.sessao_id === null);
  }

  if (!filtro.incluirInativos) {
    lista = lista.filter((a) => !a.soft_delete && a.status_ativo);
  }

  // Ordena por data decrescente (mais recentes primeiro)
  lista.sort((a, b) => {
    const dataA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dataB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dataB - dataA;
  });

  return JSON.parse(JSON.stringify(lista));
}

/**
 * Retrieves clinical note by UUID.
 */
export async function buscarAnotacaoMockPorId(
  id: string,
): Promise<AnotacaoClinica | null> {
  const encontrada = anotacoesMockState.find((a) => a.id === id);
  return encontrada ? JSON.parse(JSON.stringify(encontrada)) : null;
}

/**
 * Creates new clinical note respecting therapist authorship (RF21).
 */
export async function criarAnotacaoMock(
  dto: CriarAnotacaoDTO,
  terapeutaIdPadrao = "a9849163-613f-4492-90cf-89985902d16e",
): Promise<AnotacaoClinica> {
  const novoId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `anot-${Date.now()}`;

  const agora = new Date().toISOString();

  const novaAnotacao: AnotacaoClinica = {
    id: novoId,
    terapeuta_id: dto.terapeuta_id || terapeutaIdPadrao,
    paciente_id: dto.paciente_id,
    sessao_id: dto.sessao_id ?? null,
    conteudo: dto.conteudo.trim(),
    soft_delete: false,
    status_ativo: true,
    terapeuta_nome: "Terapeuta Responsável",
    paciente_nome: "Paciente Vinculado",
    created_at: agora,
    updated_at: agora,
  };

  anotacoesMockState.push(novaAnotacao);
  return JSON.parse(JSON.stringify(novaAnotacao));
}

/**
 * Updates textual content of clinical note.
 */
export async function atualizarAnotacaoMock(
  id: string,
  dto: AtualizarAnotacaoDTO,
): Promise<AnotacaoClinica | null> {
  const index = anotacoesMockState.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const atualizada: AnotacaoClinica = {
    ...anotacoesMockState[index],
    ...(dto.conteudo !== undefined && { conteudo: dto.conteudo.trim() }),
    ...(dto.soft_delete !== undefined && {
      soft_delete: dto.soft_delete,
      status_ativo: !dto.soft_delete,
    }),
    ...(dto.status_ativo !== undefined && {
      status_ativo: dto.status_ativo,
      soft_delete: !dto.status_ativo,
    }),
    updated_at: new Date().toISOString(),
  };

  anotacoesMockState[index] = atualizada;
  return JSON.parse(JSON.stringify(atualizada));
}

/**
 * Applies soft delete preserving clinical history (RN05).
 */
export async function softDeleteAnotacaoMock(
  id: string,
): Promise<AnotacaoClinica | null> {
  return atualizarAnotacaoMock(id, { soft_delete: true, status_ativo: false });
}

/**
 * Reactivates inactive clinical note (RN05).
 */
export async function reativarAnotacaoMock(
  id: string,
): Promise<AnotacaoClinica | null> {
  return atualizarAnotacaoMock(id, { soft_delete: false, status_ativo: true });
}

/**
 * Permanent physical deletion for test suites / SuperAdmin.
 */
export async function deletarHardAnotacaoMock(id: string): Promise<boolean> {
  const index = anotacoesMockState.findIndex((a) => a.id === id);
  if (index === -1) return false;
  anotacoesMockState.splice(index, 1);
  return true;
}
