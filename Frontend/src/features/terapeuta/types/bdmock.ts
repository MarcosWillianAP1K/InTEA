/**
 * ============================================================================
 * THERAPIST DOMAIN IN-MEMORY FIXTURES AND MOCKS
 * Sample therapists associated with Clinic and SuperAdmin profile.
 * ============================================================================
 */

import type {
  Terapeuta,
  AreaFoco,
  AtualizarTerapeutaDTO,
  CriarTerapeutaDTO,
} from "./terapeuta.types";
import { MOCK_CLINICA } from "@/shared/types";

// ============================================================================
// FIXTURES DE ÁREAS DE FOCO
// ============================================================================

export const MOCK_AREAS_FOCO: AreaFoco[] = [
  {
    id: "af-001",
    nome: "Integração Sensorial",
    descricao: "Modulação sensorial, processamento vestibular e proprioceptivo",
  },
  {
    id: "af-002",
    nome: "Comunicação Aumentativa e Alternativa (CAA)",
    descricao: "Sistemas PECS e estimulação de intenção comunicativa",
  },
  {
    id: "af-003",
    nome: "Psicomotricidade e Coordenação Motora",
    descricao: "Desenvolvimento psicomotor, praxia fina e global",
  },
  {
    id: "af-004",
    nome: "Regulação Emocional e DDA",
    descricao: "Estratégias de autorregulação e modulação dinâmica de dificuldade",
  },
];

// ============================================================================
// FIXTURES DE TERAPEUTAS MODELO
// ============================================================================

export const MOCK_TERAPEUTA_MARCOS: Terapeuta = {
  id: "a9849163-613f-4492-90cf-89985902d16e",
  clinica_id: MOCK_CLINICA.id,
  nome: "Dr. Marcos Terapeuta",
  email: "marcos.terapeuta@intea.com.br",
  telefone: "(86) 99999-1234",
  crefito: "CREFITO-14/12345-TO",
  registro_profissional: "CREFITO-14/12345-TO",
  especialidade: "Terapia Ocupacional e Integração Sensorial",
  tempo_experiencia_anos: 6,
  is_super_admin: false,
  status_ativo: true,
  created_at: "2026-01-10T10:00:00.000Z",
  updated_at: "2026-01-10T10:00:00.000Z",
  areas_foco: [MOCK_AREAS_FOCO[0], MOCK_AREAS_FOCO[3]],
};

export const MOCK_TERAPEUTA_LUMA: Terapeuta = {
  id: "b3333333-3333-4333-8333-333333333333",
  clinica_id: MOCK_CLINICA.id,
  nome: "Dra. Luma Maiara",
  email: "luma.maiara@intea.com.br",
  telefone: "(86) 99988-7766",
  crefito: "CRP-21/04567",
  registro_profissional: "CRP-21/04567",
  especialidade: "Psicologia Cognitivo-Comportamental e ABA",
  tempo_experiencia_anos: 5,
  is_super_admin: false,
  status_ativo: true,
  created_at: "2026-01-12T14:00:00.000Z",
  updated_at: "2026-01-12T14:00:00.000Z",
  areas_foco: [MOCK_AREAS_FOCO[1], MOCK_AREAS_FOCO[3]],
};

export const MOCK_TERAPEUTA_HERMESON: Terapeuta = {
  id: "c4444444-4444-4444-8444-444444444444",
  clinica_id: MOCK_CLINICA.id,
  nome: "Dr. Hermeson Alves",
  email: "hermeson.alves@intea.com.br",
  telefone: "(86) 99977-1122",
  crefito: "CREFITO-14/87654-TO",
  registro_profissional: "CREFITO-14/87654-TO",
  especialidade: "Psicomotricidade e Reabilitação Motora",
  tempo_experiencia_anos: 4,
  is_super_admin: false,
  status_ativo: true,
  created_at: "2026-01-15T09:00:00.000Z",
  updated_at: "2026-01-15T09:00:00.000Z",
  areas_foco: [MOCK_AREAS_FOCO[2]],
};

export const MOCK_TERAPEUTA_SUPERADMIN: Terapeuta = {
  id: "d2222222-2222-4222-8222-222222222222",
  clinica_id: MOCK_CLINICA.id,
  nome: "Admin InTEA",
  email: "admin@intea.com.br",
  telefone: "(86) 98888-5678",
  crefito: "CREFITO-14/99999-TO",
  registro_profissional: "CREFITO-14/99999-TO",
  especialidade: "SuperAdmin do Sistema",
  tempo_experiencia_anos: 12,
  is_super_admin: true,
  status_ativo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  areas_foco: MOCK_AREAS_FOCO,
};

export const MOCK_TERAPEUTA_INATIVO: Terapeuta = {
  id: "e5555555-5555-4555-8555-555555555555",
  clinica_id: MOCK_CLINICA.id,
  nome: "Dr. Roberto Inativo",
  email: "roberto.inativo@intea.com.br",
  telefone: "(86) 99900-1122",
  crefito: "CRP-21/00000",
  registro_profissional: "CRP-21/00000",
  especialidade: "Neuropsicologia",
  tempo_experiencia_anos: 3,
  is_super_admin: false,
  status_ativo: false,
  created_at: "2025-11-01T10:00:00.000Z",
  updated_at: "2026-01-02T15:00:00.000Z",
  areas_foco: [],
};

export const FIXTURES_TERAPEUTAS: Terapeuta[] = [
  MOCK_TERAPEUTA_MARCOS,
  MOCK_TERAPEUTA_LUMA,
  MOCK_TERAPEUTA_HERMESON,
  MOCK_TERAPEUTA_SUPERADMIN,
  MOCK_TERAPEUTA_INATIVO,
];

// ============================================================================
// ESTADO EM MEMÓRIA
// ============================================================================

let terapeutasMock: Terapeuta[] = JSON.parse(
  JSON.stringify(FIXTURES_TERAPEUTAS),
);

/**
 * Restores initial in-memory therapist fixtures.
 */
export function resetarTerapeutasMock(): void {
  terapeutasMock = JSON.parse(JSON.stringify(FIXTURES_TERAPEUTAS));
}

// ============================================================================
// HELPERS EM MEMÓRIA
// ============================================================================

/**
 * Lists in-memory therapists (filters inactive accounts by default, RN05).
 */
export async function listarTerapeutasMock(
  incluirInativos = false,
): Promise<Terapeuta[]> {
  const lista = incluirInativos
    ? terapeutasMock
    : terapeutasMock.filter((t) => t.status_ativo);

  return JSON.parse(JSON.stringify(lista));
}

/**
 * Retrieves therapist by UUID in memory.
 */
export async function buscarTerapeutaMockPorId(
  id: string,
): Promise<Terapeuta | null> {
  const encontrado = terapeutasMock.find((t) => t.id === id);
  return encontrado ? JSON.parse(JSON.stringify(encontrado)) : null;
}

/**
 * Registers new therapist in memory.
 */
export async function criarTerapeutaMock(
  dto: CriarTerapeutaDTO,
): Promise<Terapeuta> {
  const novoId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ter-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const agora = new Date().toISOString();

  const areasFocoVinculadas: AreaFoco[] = (dto.areas_foco_ids ?? [])
    .map((afId) => MOCK_AREAS_FOCO.find((af) => af.id === afId))
    .filter((af): af is AreaFoco => af !== undefined);

  const novoTerapeuta: Terapeuta = {
    id: novoId,
    clinica_id: dto.clinica_id ?? MOCK_CLINICA.id,
    nome: dto.nome,
    email: dto.email,
    telefone: dto.telefone ?? null,
    crefito: dto.crefito ?? null,
    registro_profissional: dto.registro_profissional ?? dto.crefito ?? null,
    especialidade: dto.especialidade ?? null,
    tempo_experiencia_anos: dto.tempo_experiencia_anos ?? 0,
    is_super_admin: dto.is_super_admin ?? false,
    status_ativo: true,
    created_at: agora,
    updated_at: agora,
    areas_foco: areasFocoVinculadas,
  };

  terapeutasMock.push(novoTerapeuta);
  return JSON.parse(JSON.stringify(novoTerapeuta));
}

/**
 * Updates therapist fields in memory.
 */
export async function atualizarTerapeutaMock(
  id: string,
  dto: AtualizarTerapeutaDTO,
): Promise<Terapeuta | null> {
  const index = terapeutasMock.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const terapeutaExistente = terapeutasMock[index];

  let areasFocoAtualizadas = terapeutaExistente.areas_foco;
  if (dto.areas_foco_ids) {
    areasFocoAtualizadas = dto.areas_foco_ids
      .map((afId) => MOCK_AREAS_FOCO.find((af) => af.id === afId))
      .filter((af): af is AreaFoco => af !== undefined);
  }

  const atualizado: Terapeuta = {
    ...terapeutaExistente,
    ...(dto.nome !== undefined && { nome: dto.nome }),
    ...(dto.telefone !== undefined && { telefone: dto.telefone }),
    ...(dto.crefito !== undefined && { crefito: dto.crefito }),
    ...(dto.registro_profissional !== undefined && {
      registro_profissional: dto.registro_profissional,
    }),
    ...(dto.especialidade !== undefined && { especialidade: dto.especialidade }),
    ...(dto.tempo_experiencia_anos !== undefined && {
      tempo_experiencia_anos: dto.tempo_experiencia_anos,
    }),
    ...(dto.clinica_id !== undefined && { clinica_id: dto.clinica_id }),
    ...(dto.status_ativo !== undefined && { status_ativo: dto.status_ativo }),
    areas_foco: areasFocoAtualizadas,
    updated_at: new Date().toISOString(),
  };

  terapeutasMock[index] = atualizado;
  return JSON.parse(JSON.stringify(atualizado));
}

/**
 * Deactivates therapist in memory applying soft delete (RN05).
 */
export async function inativarTerapeutaMock(
  id: string,
): Promise<Terapeuta | null> {
  return atualizarTerapeutaMock(id, { status_ativo: false });
}

/**
 * Reactivates deactivated therapist in memory (RN05).
 */
export async function reativarTerapeutaMock(
  id: string,
): Promise<Terapeuta | null> {
  return atualizarTerapeutaMock(id, { status_ativo: true });
}
