// ==============================================================================
// InTEA: Suíte de Integração — Equipe Multidisciplinar e Visibilidade (RN04, RF18, RF21, RN01)
// ==============================================================================
// Simula o ciclo de vida completo de uma clínica multidisciplinar com:
// - Terapeuta A (Líder / Terapeuta Responsável) e Terapeuta B (Clínica 1, vinculados ao Paciente X)
// - Terapeuta C (Clínica 2, sem vínculo)
// - Terapeuta D (Clínica 1, sem vínculo em terapeuta_paciente)
// - Terapeuta Inativo X (Clínica 1, status_ativo = false)
// - SuperAdmin Institucional
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pacienteRoutes } from '../routes/paciente.routes.js';
import { sessaoRoutes } from '../../sessao/routes/sessao.routes.js';
import { anotacaoRoutes } from '../../anotacao/routes/anotacao.routes.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { SessoesAtivasService } from '../../../core/auth/sessoes-ativas.service.js';
import { MODO_SESSAO, STATUS_SESSAO } from '../../sessao/models/sessao.model.js';
import {
  criarMockReqResPaciente,
  executarPipelinePaciente,
  obterHandlersPaciente,
  type EnvelopeRespostaTeste,
} from './helpers/pipeline.js';

interface TerapeutaRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  crefito: string | null;
  registro_profissional: string | null;
  especialidade: string | null;
  tempo_experiencia_anos: number;
  clinica_id: string | null;
  is_super_admin: boolean;
  status_ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface PacienteRow {
  id: string;
  nome: string;
  data_nascimento: string;
  cpf: string;
  clinica_id: string | null;
  telefone: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  status_ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface VinculoRow {
  paciente_id: string;
  terapeuta_id: string;
  created_at: string;
}

interface ResponsavelEquipeRow {
  paciente_id: string;
  terapeuta_id: string;
  created_at: string;
  updated_at: string;
}

interface SessaoRow {
  id: string;
  terapeuta_id: string;
  paciente_id: string | null;
  jogo_id: string;
  session_token: string;
  modo_sessao: string;
  status_sessao: string;
  contexto_dda_json: Record<string, unknown>;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  expira_em: string;
  created_at: string;
  updated_at: string;
  relatorio_sessao?: {
    sessao_id: string;
    conteudo: string;
    dados_ia_json: Record<string, unknown>;
    soft_delete: boolean;
  } | null;
}

interface AnotacaoRow {
  id: string;
  terapeuta_id: string;
  paciente_id: string;
  sessao_id: string | null;
  conteudo: string;
  soft_delete: boolean;
  created_at: string;
  updated_at: string;
}

interface JogoRow {
  id: string;
  nome: string;
  descricao: string;
  versao: string;
  status_jogo: string;
  manifesto_json: {
    id_jogo: string;
    nome: string;
    versao: string;
    objetivo_clinico: string;
    cooperativo: boolean;
    adaptativo: boolean;
    metricas_suportadas: Array<{
      id_metrica: string;
      tipo_metrica: string;
      unidade?: string;
    }>;
  };
}

describe('Integração Multi-Terapeuta, Visibilidade Compartilhada e Isolamento Clínico (RN04, RF18, RF21, RN01)', () => {
  const clinica1Id = '11111111-1111-4111-8111-111111111111';
  const clinica2Id = '22222222-2222-4222-8222-222222222222';

  const terapeutaAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const terapeutaBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const terapeutaCId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const terapeutaDId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const terapeutaInativoId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const superAdminId = '99999999-9999-4999-8999-999999999999';

  const pacienteXId = 'f1111111-1111-4111-8111-111111111111';
  const pacienteInexistenteId = 'f9999999-9999-4999-8999-999999999999';
  const terapeutaInexistenteId = 'a9999999-9999-4999-8999-999999999999';
  const jogoId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  const sessaoClinicaAId = '51111111-1111-4111-8111-111111111111';
  const sessaoClinicaBId = '52222222-2222-4222-8222-222222222222';
  const sessaoModoLivreAId = '53333333-3333-4333-8333-333333333333';

  const anotacaoTerapeutaAId = '71111111-1111-4111-8111-111111111111';

  const TOKEN_A = 'token-terapeuta-a';
  const TOKEN_B = 'token-terapeuta-b';
  const TOKEN_C = 'token-terapeuta-c';
  const TOKEN_D = 'token-terapeuta-d';
  const TOKEN_ADMIN = 'token-super-admin';
  const TOKEN_ADMIN_DB_ONLY = 'token-super-admin-db-only';

  let dbTerapeutas: TerapeutaRow[];
  let dbPacientes: PacienteRow[];
  let dbVinculos: VinculoRow[];
  let dbResponsaveisEquipe: ResponsavelEquipeRow[];
  let dbSessoes: SessaoRow[];
  let dbAnotacoes: AnotacaoRow[];
  let dbJogos: JogoRow[];

  function obterTerapeutaPorId(id: string): TerapeutaRow | undefined {
    return dbTerapeutas.find((t) => t.id === id);
  }

  function enriquecerSessao(s: SessaoRow): Record<string, unknown> {
    const t = obterTerapeutaPorId(s.terapeuta_id);
    const p = s.paciente_id ? dbPacientes.find((pac) => pac.id === s.paciente_id) : null;
    const j = dbJogos.find((jg) => jg.id === s.jogo_id);
    return {
      ...s,
      terapeuta: t
        ? {
            id: t.id,
            nome: t.nome,
            especialidade: t.especialidade,
            crefito: t.crefito,
            registro_profissional: t.registro_profissional,
          }
        : null,
      paciente: p
        ? {
            id: p.id,
            nome: p.nome,
            data_nascimento: p.data_nascimento,
          }
        : null,
      jogo: j
        ? {
            id: j.id,
            nome: j.nome,
            versao: j.versao,
          }
        : undefined,
    };
  }

  function enriquecerAnotacao(a: AnotacaoRow): Record<string, unknown> {
    const t = obterTerapeutaPorId(a.terapeuta_id);
    return {
      ...a,
      terapeuta: t
        ? {
            id: t.id,
            nome: t.nome,
            registro_profissional: t.registro_profissional,
            crefito: t.crefito,
            especialidade: t.especialidade,
          }
        : null,
    };
  }

  function criarQueryBuilderInMemory<TRow extends Record<string, unknown>>(
    obterLinhas: () => TRow[],
    opcoes?: {
      onInsert?: (novos: Record<string, unknown>[]) => TRow[];
      onUpsert?: (novo: Record<string, unknown>) => TRow[];
      onUpdate?: (
        campos: Record<string, unknown>,
        filtros: Array<(r: TRow) => boolean>
      ) => TRow[];
      onDelete?: (filtros: Array<(r: TRow) => boolean>) => void;
    }
  ): Record<string, unknown> {
    const filtros: Array<(r: TRow) => boolean> = [];
    let modoOperacao: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
    let linhasMutadas: TRow[] = [];
    let camposUpdate: Record<string, unknown> = {};
    let headCountOnly = false;

    const avaliarLinhas = (): TRow[] => {
      if (modoOperacao === 'insert' || modoOperacao === 'upsert') {
        return linhasMutadas;
      }
      if (modoOperacao === 'update') {
        linhasMutadas = opcoes?.onUpdate ? opcoes.onUpdate(camposUpdate, filtros) : [];
        return linhasMutadas;
      }
      if (modoOperacao === 'delete') {
        opcoes?.onDelete?.(filtros);
        return [];
      }
      return obterLinhas().filter((linha) => filtros.every((fn) => fn(linha)));
    };

    const builder: Record<string, unknown> = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (opts?.head) {
          headCountOnly = true;
        }
        return builder;
      },
      insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
        modoOperacao = 'insert';
        const arr = Array.isArray(payload) ? payload : [payload];
        linhasMutadas = opcoes?.onInsert ? opcoes.onInsert(arr) : [];
        return builder;
      },
      upsert(payload: Record<string, unknown>) {
        modoOperacao = 'upsert';
        linhasMutadas = opcoes?.onUpsert ? opcoes.onUpsert(payload) : [];
        return builder;
      },
      update(campos: Record<string, unknown>) {
        modoOperacao = 'update';
        camposUpdate = campos;
        return builder;
      },
      delete() {
        modoOperacao = 'delete';
        return builder;
      },
      eq(coluna: string, valor: unknown) {
        filtros.push((r) => r[coluna] === valor);
        return builder;
      },
      in(coluna: string, valores: unknown[]) {
        filtros.push((r) => valores.includes(r[coluna]));
        return builder;
      },
      is(coluna: string, valor: unknown) {
        filtros.push((r) => (r[coluna] ?? null) === valor);
        return builder;
      },
      not(coluna: string, operador: string, valor: unknown) {
        if (operador === 'is') {
          filtros.push((r) => (r[coluna] ?? null) !== valor);
        }
        return builder;
      },
      or(expressao: string) {
        const matchId = expressao.match(/id\.eq\.([0-9a-fA-F-]+)/);
        if (matchId?.[1]) {
          const idAlvo = matchId[1];
          filtros.push((r) => String(r.id) === idAlvo);
        }
        return builder;
      },
      gte(coluna: string, valor: string) {
        filtros.push((r) => String(r[coluna] ?? '') >= valor);
        return builder;
      },
      lte(coluna: string, valor: string) {
        filtros.push((r) => String(r[coluna] ?? '') <= valor);
        return builder;
      },
      ilike(coluna: string, padrao: string) {
        const termo = padrao.replace(/%/g, '').toLowerCase();
        filtros.push((r) => String(r[coluna] ?? '').toLowerCase().includes(termo));
        return builder;
      },
      order() {
        return builder;
      },
      range(from: number, to: number) {
        const lista = avaliarLinhas();
        const fatia = lista.slice(from, to + 1);
        return Promise.resolve({
          data: fatia,
          error: null,
          count: lista.length,
        });
      },
      maybeSingle() {
        const lista = avaliarLinhas();
        return Promise.resolve({
          data: lista[0] ?? null,
          error: null,
        });
      },
      single() {
        const lista = avaliarLinhas();
        if (lista.length === 0) {
          return Promise.resolve({
            data: null,
            error: { message: 'Registro não encontrado' },
          });
        }
        return Promise.resolve({
          data: lista[0],
          error: null,
        });
      },
      then(
        onFulfilled?: (value: {
          data: TRow[] | null;
          error: null;
          count: number;
        }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        const lista = avaliarLinhas();
        const resultado = {
          data: headCountOnly ? null : lista,
          error: null,
          count: lista.length,
        };
        return Promise.resolve(resultado).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  beforeEach(() => {
    vi.restoreAllMocks();

    const agora = '2026-10-25T12:00:00.000Z';

    dbTerapeutas = [
      {
        id: terapeutaAId,
        nome: 'Dr. Terapeuta A',
        email: 'terapeuta.a@intea.com.br',
        telefone: null,
        crefito: 'CREFITO-111',
        registro_profissional: 'CREFITO-111',
        especialidade: 'Terapia Ocupacional',
        tempo_experiencia_anos: 6,
        clinica_id: clinica1Id,
        is_super_admin: false,
        status_ativo: true,
        created_at: agora,
        updated_at: agora,
      },
      {
        id: terapeutaBId,
        nome: 'Dra. Terapeuta B',
        email: 'terapeuta.b@intea.com.br',
        telefone: null,
        crefito: 'CRFa-222',
        registro_profissional: 'CRFa-222',
        especialidade: 'Fonoaudiologia',
        tempo_experiencia_anos: 4,
        clinica_id: clinica1Id,
        is_super_admin: false,
        status_ativo: true,
        created_at: agora,
        updated_at: agora,
      },
      {
        id: terapeutaCId,
        nome: 'Dr. Terapeuta C (Outra Clínica)',
        email: 'terapeuta.c@outraclinica.com.br',
        telefone: null,
        crefito: 'CRP-333',
        registro_profissional: 'CRP-333',
        especialidade: 'Psicologia',
        tempo_experiencia_anos: 5,
        clinica_id: clinica2Id,
        is_super_admin: false,
        status_ativo: true,
        created_at: agora,
        updated_at: agora,
      },
      {
        id: terapeutaDId,
        nome: 'Dra. Terapeuta D (Mesma Clínica Sem Vínculo)',
        email: 'terapeuta.d@intea.com.br',
        telefone: null,
        crefito: 'CREFITO-444',
        registro_profissional: 'CREFITO-444',
        especialidade: 'Fisioterapia',
        tempo_experiencia_anos: 3,
        clinica_id: clinica1Id,
        is_super_admin: false,
        status_ativo: true,
        created_at: agora,
        updated_at: agora,
      },
      {
        id: terapeutaInativoId,
        nome: 'Dr. Terapeuta X Inativo',
        email: 'inativo@intea.com.br',
        telefone: null,
        crefito: 'CRP-555',
        registro_profissional: 'CRP-555',
        especialidade: 'Psicopedagogia',
        tempo_experiencia_anos: 7,
        clinica_id: clinica1Id,
        is_super_admin: false,
        status_ativo: false,
        created_at: agora,
        updated_at: agora,
      },
      {
        id: superAdminId,
        nome: 'SuperAdmin Institucional',
        email: 'admin@intea.com.br',
        telefone: null,
        crefito: null,
        registro_profissional: null,
        especialidade: 'Coordenação Clínica',
        tempo_experiencia_anos: 10,
        clinica_id: clinica1Id,
        is_super_admin: true,
        status_ativo: true,
        created_at: agora,
        updated_at: agora,
      },
    ];

    dbPacientes = [
      {
        id: pacienteXId,
        nome: 'Paciente X Multidisciplinar',
        data_nascimento: '2018-04-12',
        cpf: '529.982.247-25',
        clinica_id: clinica1Id,
        telefone: '+55 (11) 98765-4321',
        cep: '01310-100',
        cidade: 'Teresina',
        estado: 'PI',
        endereco: 'Av. Frei Serafim',
        bairro: 'Centro',
        numero: '100',
        complemento: null,
        status_ativo: true,
        created_at: agora,
        updated_at: agora,
      },
    ];

    dbVinculos = [
      {
        paciente_id: pacienteXId,
        terapeuta_id: terapeutaAId,
        created_at: agora,
      },
    ];

    dbResponsaveisEquipe = [
      {
        paciente_id: pacienteXId,
        terapeuta_id: terapeutaAId,
        created_at: agora,
        updated_at: agora,
      },
    ];

    dbJogos = [
      {
        id: jogoId,
        nome: 'Aventura Sensorial Cooperativa',
        descricao: 'Jogo terapêutico adaptativo homologado.',
        versao: '1.0.0',
        status_jogo: 'ativo',
        manifesto_json: {
          id_jogo: 'aventura-sensorial',
          nome: 'Aventura Sensorial Cooperativa',
          versao: '1.0.0',
          objetivo_clinico: 'foco_atencional',
          cooperativo: true,
          adaptativo: true,
          metricas_suportadas: [
            {
              id_metrica: 'tempo_resposta',
              tipo_metrica: 'numerica',
              unidade: 'segundos',
            },
          ],
        },
      },
    ];

    dbSessoes = [
      {
        id: sessaoClinicaAId,
        terapeuta_id: terapeutaAId,
        paciente_id: pacienteXId,
        jogo_id: jogoId,
        session_token: 'AAAA-1111',
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        status_sessao: STATUS_SESSAO.FINALIZADA,
        contexto_dda_json: {},
        data_hora_inicio: '2026-10-20T10:00:00.000Z',
        data_hora_fim: '2026-10-20T10:20:00.000Z',
        expira_em: '2026-10-20T10:15:00.000Z',
        created_at: '2026-10-20T10:00:00.000Z',
        updated_at: '2026-10-20T10:20:00.000Z',
        relatorio_sessao: {
          sessao_id: sessaoClinicaAId,
          conteudo: 'Sessão conduzida pelo Terapeuta A.',
          dados_ia_json: {
            duracao_segundos: 1200,
            metricas_agregadas: [
              { id_metrica: 'tempo_resposta', valor_dominante: 1.4, tendencia: 'estavel' },
            ],
          },
          soft_delete: false,
        },
      },
      {
        id: sessaoClinicaBId,
        terapeuta_id: terapeutaBId,
        paciente_id: pacienteXId,
        jogo_id: jogoId,
        session_token: 'BBBB-2222',
        modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
        status_sessao: STATUS_SESSAO.FINALIZADA,
        contexto_dda_json: {},
        data_hora_inicio: '2026-10-22T14:00:00.000Z',
        data_hora_fim: '2026-10-22T14:25:00.000Z',
        expira_em: '2026-10-22T14:15:00.000Z',
        created_at: '2026-10-22T14:00:00.000Z',
        updated_at: '2026-10-22T14:25:00.000Z',
        relatorio_sessao: {
          sessao_id: sessaoClinicaBId,
          conteudo: 'Sessão conduzida pela Terapeuta B.',
          dados_ia_json: {
            duracao_segundos: 1500,
            metricas_agregadas: [
              { id_metrica: 'tempo_resposta', valor_dominante: 1.2, tendencia: 'melhora' },
            ],
          },
          soft_delete: false,
        },
      },
      {
        id: sessaoModoLivreAId,
        terapeuta_id: terapeutaAId,
        paciente_id: null,
        jogo_id: jogoId,
        session_token: 'FREE-0000',
        modo_sessao: MODO_SESSAO.MODO_LIVRE,
        status_sessao: STATUS_SESSAO.FINALIZADA,
        contexto_dda_json: {},
        data_hora_inicio: '2026-10-23T09:00:00.000Z',
        data_hora_fim: '2026-10-23T09:10:00.000Z',
        expira_em: '2026-10-23T09:15:00.000Z',
        created_at: '2026-10-23T09:00:00.000Z',
        updated_at: '2026-10-23T09:10:00.000Z',
        relatorio_sessao: null,
      },
    ];

    dbAnotacoes = [
      {
        id: anotacaoTerapeutaAId,
        terapeuta_id: terapeutaAId,
        paciente_id: pacienteXId,
        sessao_id: null,
        conteudo: 'Anotação de prontuário registrada pelo Terapeuta A.',
        soft_delete: false,
        created_at: '2026-10-20T11:00:00.000Z',
        updated_at: '2026-10-20T11:00:00.000Z',
      },
    ];

    vi.spyOn(SessoesAtivasService, 'isTokenRevogado').mockResolvedValue(false);

    vi.spyOn(supabase.auth, 'getUser').mockImplementation(async (token?: string) => {
      const mapaTokens: Record<string, { id: string; email: string; is_super_admin?: boolean }> = {
        [TOKEN_A]: { id: terapeutaAId, email: 'terapeuta.a@intea.com.br', is_super_admin: false },
        [TOKEN_B]: { id: terapeutaBId, email: 'terapeuta.b@intea.com.br', is_super_admin: false },
        [TOKEN_C]: { id: terapeutaCId, email: 'terapeuta.c@outraclinica.com.br', is_super_admin: false },
        [TOKEN_D]: { id: terapeutaDId, email: 'terapeuta.d@intea.com.br', is_super_admin: false },
        [TOKEN_ADMIN]: {
          id: superAdminId,
          email: 'admin@intea.com.br',
          is_super_admin: true,
        },
        [TOKEN_ADMIN_DB_ONLY]: {
          id: superAdminId,
          email: 'admin@intea.com.br',
          is_super_admin: false,
        },
      };

      const usuario = token ? mapaTokens[token] : undefined;
      if (!usuario) {
        return {
          data: { user: null },
          error: { message: 'Token inválido' },
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>;
      }

      return {
        data: {
          user: {
            id: usuario.id,
            email: usuario.email,
            is_super_admin: usuario.is_super_admin,
            app_metadata: { is_super_admin: usuario.is_super_admin },
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>;
    });

    vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
      if (tabela === 'terapeuta') {
        return criarQueryBuilderInMemory(() =>
          dbTerapeutas.map((t) => ({ ...t }) as unknown as Record<string, unknown>)
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      if (tabela === 'paciente') {
        return criarQueryBuilderInMemory(
          () =>
            dbPacientes.map((p) => {
              const terapeutasDoPaciente = dbVinculos
                .filter((v) => v.paciente_id === p.id)
                .map((v) => ({
                  created_at: v.created_at,
                  terapeuta: obterTerapeutaPorId(v.terapeuta_id),
                }));
              const respEquipe = dbResponsaveisEquipe.find((r) => r.paciente_id === p.id);
              return {
                ...p,
                responsaveis: [],
                terapeutas: terapeutasDoPaciente,
                terapeuta_responsavel: respEquipe ? [{ terapeuta_id: respEquipe.terapeuta_id }] : [],
              } as unknown as Record<string, unknown>;
            }),
          {
            onInsert: (novos) => {
              const criados: Record<string, unknown>[] = [];
              for (const item of novos) {
                const novoPac: PacienteRow = {
                  id: String(item.id || 'f2222222-2222-4222-8222-222222222222'),
                  nome: String(item.nome || ''),
                  data_nascimento: String(item.data_nascimento || '2018-01-01'),
                  cpf: String(item.cpf || ''),
                  clinica_id: item.clinica_id ? String(item.clinica_id) : null,
                  telefone: item.telefone ? String(item.telefone) : null,
                  cep: item.cep ? String(item.cep) : null,
                  cidade: item.cidade ? String(item.cidade) : null,
                  estado: item.estado ? String(item.estado) : null,
                  endereco: item.endereco ? String(item.endereco) : null,
                  bairro: item.bairro ? String(item.bairro) : null,
                  numero: item.numero ? String(item.numero) : null,
                  complemento: item.complemento ? String(item.complemento) : null,
                  status_ativo: item.status_ativo !== false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                dbPacientes.push(novoPac);
                criados.push({ ...novoPac });
              }
              return criados;
            },
          }
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      if (tabela === 'terapeuta_paciente') {
        return criarQueryBuilderInMemory(
          () =>
            dbVinculos.map((v) => ({
              paciente_id: v.paciente_id,
              terapeuta_id: v.terapeuta_id,
              created_at: v.created_at,
              terapeuta: obterTerapeutaPorId(v.terapeuta_id) ?? null,
            })),
          {
            onInsert: (novos) => {
              const criados: Array<{
                paciente_id: string;
                terapeuta_id: string;
                created_at: string;
                terapeuta: TerapeutaRow | null;
              }> = [];
              for (const item of novos) {
                const novoVinculo: VinculoRow = {
                  paciente_id: String(item.paciente_id),
                  terapeuta_id: String(item.terapeuta_id),
                  created_at: String(item.created_at || new Date().toISOString()),
                };
                dbVinculos.push(novoVinculo);
                criados.push({
                  ...novoVinculo,
                  terapeuta: obterTerapeutaPorId(novoVinculo.terapeuta_id) ?? null,
                });
              }
              return criados;
            },
            onUpsert: (item) => {
              const pId = String(item.paciente_id);
              const tId = String(item.terapeuta_id);
              const jaExiste = dbVinculos.some(
                (v) => v.paciente_id === pId && v.terapeuta_id === tId
              );
              if (!jaExiste) {
                dbVinculos.push({
                  paciente_id: pId,
                  terapeuta_id: tId,
                  created_at: String(item.created_at || new Date().toISOString()),
                });
              }
              return [];
            },
            onDelete: (filtrosDelete) => {
              dbVinculos = dbVinculos.filter((v) => {
                const row = {
                  paciente_id: v.paciente_id,
                  terapeuta_id: v.terapeuta_id,
                  created_at: v.created_at,
                  terapeuta: obterTerapeutaPorId(v.terapeuta_id) ?? null,
                };
                return !filtrosDelete.every((fn) => fn(row));
              });
            },
          }
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      if (tabela === 'terapeuta_paciente_responsavel') {
        return criarQueryBuilderInMemory(
          () => dbResponsaveisEquipe.map((r) => ({ ...r }) as unknown as Record<string, unknown>),
          {
            onUpsert: (item) => {
              const pId = String(item.paciente_id);
              const tId = String(item.terapeuta_id);
              const jaExiste = dbResponsaveisEquipe.some((r) => r.paciente_id === pId);
              if (!jaExiste) {
                dbResponsaveisEquipe.push({
                  paciente_id: pId,
                  terapeuta_id: tId,
                  created_at: String(item.created_at || new Date().toISOString()),
                  updated_at: String(item.updated_at || new Date().toISOString()),
                });
              }
              return [];
            },
          }
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      if (tabela === 'sessao') {
        return criarQueryBuilderInMemory(() =>
          dbSessoes.map((s) => enriquecerSessao(s))
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      if (tabela === 'anotacao_clinica') {
        return criarQueryBuilderInMemory(
          () => dbAnotacoes.map((a) => enriquecerAnotacao(a)),
          {
            onInsert: (novos) => {
              const criadas: Record<string, unknown>[] = [];
              for (const item of novos) {
                const nova: AnotacaoRow = {
                  id: '72222222-2222-4222-8222-222222222222',
                  terapeuta_id: String(item.terapeuta_id),
                  paciente_id: String(item.paciente_id),
                  sessao_id: item.sessao_id ? String(item.sessao_id) : null,
                  conteudo: String(item.conteudo),
                  soft_delete: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                dbAnotacoes.push(nova);
                criadas.push(enriquecerAnotacao(nova));
              }
              return criadas;
            },
            onUpdate: (campos, filtrosUpdate) => {
              const atualizadas: Record<string, unknown>[] = [];
              for (const anot of dbAnotacoes) {
                const enriquecida = enriquecerAnotacao(anot);
                if (filtrosUpdate.every((fn) => fn(enriquecida))) {
                  if (typeof campos.conteudo === 'string') {
                    anot.conteudo = campos.conteudo;
                  }
                  if (typeof campos.soft_delete === 'boolean') {
                    anot.soft_delete = campos.soft_delete;
                  }
                  anot.updated_at = new Date().toISOString();
                  atualizadas.push(enriquecerAnotacao(anot));
                }
              }
              return atualizadas;
            },
          }
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      if (tabela === 'jogo') {
        return criarQueryBuilderInMemory(() =>
          dbJogos.map((j) => ({ ...j }) as unknown as Record<string, unknown>)
        ) as unknown as ReturnType<typeof supabase.from>;
      }

      return criarQueryBuilderInMemory(() => []) as unknown as ReturnType<typeof supabase.from>;
    });
  });

  // ==========================================================================
  // 1. Cadastro pelo Terapeuta A e vinculação do Terapeuta B à equipe (201 Created)
  // ==========================================================================
  it('1. Terapeuta A cadastra novo paciente (auto-vínculo como Líder) e vincula Terapeuta B da mesma clínica (201 Created)', async () => {
    const handlersCriarPaciente = obterHandlersPaciente(pacienteRoutes, '/', 'post');
    const mockCriar = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      body: {
        nome: 'Lucas Gabriel Multidisciplinar',
        data_nascimento: '2019-08-15',
        cpf: '11144477735',
      },
    });

    await executarPipelinePaciente(handlersCriarPaciente, mockCriar.req, mockCriar.res);
    expect(mockCriar.getStatus()).toBe(201);
    const idNovoPaciente = String(mockCriar.getJson().data.paciente.id);
    expect(idNovoPaciente).toBeTruthy();

    // Terapeuta A (Líder) vincula Terapeuta B ao Paciente X
    const handlersVincular = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');
    const mockVincular = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId },
      body: { terapeuta_id: terapeutaBId },
    });

    await executarPipelinePaciente(handlersVincular, mockVincular.req, mockVincular.res);
    expect(mockVincular.getStatus()).toBe(201);
    expect(mockVincular.getJson().data.vinculo).toEqual({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
    });

    // Consulta da equipe multidisciplinar retorna Terapeuta A (Líder) e Terapeuta B (Vinculado) com crefito, created_at e papel_equipe
    const handlersListarEquipe = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'get');
    const mockEquipe = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: pacienteXId },
    });

    await executarPipelinePaciente(handlersListarEquipe, mockEquipe.req, mockEquipe.res);
    expect(mockEquipe.getStatus()).toBe(200);
    expect(mockEquipe.getJson().data.terapeutas).toHaveLength(2);
    expect(mockEquipe.getJson().data.terapeutas[0]?.crefito).toBe('CREFITO-111');
    expect(mockEquipe.getJson().data.terapeutas[0]?.eh_responsavel).toBe(true);
    expect(mockEquipe.getJson().data.terapeutas[0]?.papel_equipe).toBe('Especialista Responsável');
    expect(mockEquipe.getJson().data.terapeutas[1]?.crefito).toBe('CRFa-222');
    expect(mockEquipe.getJson().data.terapeutas[1]?.eh_responsavel).toBe(false);
    expect(mockEquipe.getJson().data.terapeutas[1]?.papel_equipe).toBe('Especialista Vinculado');
  });

  // ==========================================================================
  // 2. Visibilidade compartilhada para Terapeuta B vinculado (RF18)
  // ==========================================================================
  it('2. Terapeuta B vinculado consulta prontuário, histórico geral, histórico por jogo enriquecido, sessões da equipe e anotações de A (200 OK - RF18)', async () => {
    dbVinculos.push({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
      created_at: '2026-10-21T08:00:00.000Z',
    });

    // 2.1. Prontuário (GET /api/paciente/:id)
    const handlersProntuario = obterHandlersPaciente(pacienteRoutes, '/:id', 'get');
    const mockProntuario = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: pacienteXId },
    });
    await executarPipelinePaciente(handlersProntuario, mockProntuario.req, mockProntuario.res);
    expect(mockProntuario.getStatus()).toBe(200);
    expect(mockProntuario.getJson().data.paciente.id).toBe(pacienteXId);
    expect(mockProntuario.getJson().data.terapeuta_responsavel_id).toBe(terapeutaAId);

    // 2.2. Histórico longitudinal geral (GET /api/paciente/:id/historico)
    const handlersHistorico = obterHandlersPaciente(pacienteRoutes, '/:id/historico', 'get');
    const mockHistorico = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: pacienteXId },
    });
    await executarPipelinePaciente(handlersHistorico, mockHistorico.req, mockHistorico.res);
    expect(mockHistorico.getStatus()).toBe(200);
    expect(mockHistorico.getJson().data.engajamento.total_sessoes).toBe(2);

    // 2.3. Histórico por jogo com enriquecimento de terapeuta (GET /api/paciente/:id/historico/jogo/:jogoId)
    const handlersHistJogo = obterHandlersPaciente(
      pacienteRoutes,
      '/:id/historico/jogo/:jogoId',
      'get'
    );
    const mockHistJogo = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: pacienteXId, jogoId },
    });
    await executarPipelinePaciente(handlersHistJogo, mockHistJogo.req, mockHistJogo.res);
    expect(mockHistJogo.getStatus()).toBe(200);
    const sessoesJogo = mockHistJogo.getJson().data.sessoes;
    expect(sessoesJogo).toHaveLength(2);
    const sessaoDeA = sessoesJogo.find((s) => s.sessao_id === sessaoClinicaAId) as
      | { terapeuta?: { id: string; nome: string; crefito: string | null } }
      | undefined;
    expect(sessaoDeA?.terapeuta?.id).toBe(terapeutaAId);
    expect(sessaoDeA?.terapeuta?.nome).toBe('Dr. Terapeuta A');
    expect(sessaoDeA?.terapeuta?.crefito).toBe('CREFITO-111');

    // 2.4. Sessões da equipe (GET /api/sessao?pacienteId=:id)
    const handlersSessoes = obterHandlersPaciente(sessaoRoutes, '/', 'get');
    const mockSessoes = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      query: { pacienteId: pacienteXId },
    });
    await executarPipelinePaciente(handlersSessoes, mockSessoes.req, mockSessoes.res);
    expect(mockSessoes.getStatus()).toBe(200);
    const listaSessoes = mockSessoes.getJson().data.sessoes;
    expect(listaSessoes).toHaveLength(2);
    const idsTerapeutasSessoes = listaSessoes.map((s) => s.terapeuta_id);
    expect(idsTerapeutasSessoes).toContain(terapeutaAId);
    expect(idsTerapeutasSessoes).toContain(terapeutaBId);
    const primeiraSessaoTerapeuta = (
      listaSessoes.find((s) => s.id === sessaoClinicaAId) as
        | { terapeuta?: { nome?: string; especialidade?: string } }
        | undefined
    )?.terapeuta;
    expect(primeiraSessaoTerapeuta?.nome).toBe('Dr. Terapeuta A');
    expect(primeiraSessaoTerapeuta?.especialidade).toBe('Terapia Ocupacional');

    // 2.5. Anotações do Terapeuta A (GET /api/anotacao/paciente/:pacienteId)
    const handlersAnotacoes = obterHandlersPaciente(
      anotacaoRoutes,
      '/paciente/:pacienteId',
      'get'
    );
    const mockAnotacoes = criarMockReqResPaciente<
      EnvelopeRespostaTeste & { data: { anotacoes: Array<{ id: string; terapeuta_id: string }> } }
    >({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { pacienteId: pacienteXId },
    });
    await executarPipelinePaciente(handlersAnotacoes, mockAnotacoes.req, mockAnotacoes.res);
    expect(mockAnotacoes.getStatus()).toBe(200);
    expect(mockAnotacoes.getJson().data.anotacoes).toHaveLength(1);
    expect(mockAnotacoes.getJson().data.anotacoes[0]?.terapeuta_id).toBe(terapeutaAId);
  });

  // ==========================================================================
  // 3. Bloqueio de GET /api/sessao?pacienteId=:id para Terapeuta C e D (RN04) e 400
  // ==========================================================================
  it('3. GET /api/sessao?pacienteId=:id bloqueia Terapeuta C (Clínica 2) e Terapeuta D (sem vínculo) com 403 Forbidden (RN04) e rejeita UUID inválido com 400', async () => {
    const handlersSessoes = obterHandlersPaciente(sessaoRoutes, '/', 'get');

    // Terapeuta C (Clínica 2) -> 403 Forbidden
    const mockC = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_C}` },
      query: { pacienteId: pacienteXId },
    });
    await executarPipelinePaciente(handlersSessoes, mockC.req, mockC.res);
    expect(mockC.getStatus()).toBe(403);

    // Terapeuta D (Mesma Clínica 1, mas sem vínculo em terapeuta_paciente) -> 403 Forbidden
    const mockD = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_D}` },
      query: { pacienteId: pacienteXId },
    });
    await executarPipelinePaciente(handlersSessoes, mockD.req, mockD.res);
    expect(mockD.getStatus()).toBe(403);

    // pacienteId inválido -> 400 Bad Request
    const mockInvalido = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      query: { pacienteId: 'uuid-invalido-123' },
    });
    await executarPipelinePaciente(handlersSessoes, mockInvalido.req, mockInvalido.res);
    expect(mockInvalido.getStatus()).toBe(400);
  });

  // ==========================================================================
  // 4. Autoria estrita de anotações clínicas na equipe multidisciplinar (RF21)
  // ==========================================================================
  it('4. Terapeuta B cria sua própria anotação (201 Created), mas recebe 403 Forbidden ao tentar editar ou excluir anotação de Terapeuta A (RF21)', async () => {
    dbVinculos.push({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
      created_at: '2026-10-21T08:00:00.000Z',
    });

    // Terapeuta B cria sua própria anotação no Paciente X -> 201 Created
    const handlersCriarAnotacao = obterHandlersPaciente(anotacaoRoutes, '/paciente', 'post');
    const mockCriar = criarMockReqResPaciente<
      EnvelopeRespostaTeste & { data: { anotacao: { id: string; terapeuta_id: string } } }
    >({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      body: {
        paciente_id: pacienteXId,
        conteudo: 'Evolução fonoaudiológica registrada pela Terapeuta B.',
      },
    });
    await executarPipelinePaciente(handlersCriarAnotacao, mockCriar.req, mockCriar.res);
    expect(mockCriar.getStatus()).toBe(201);
    expect(mockCriar.getJson().data.anotacao.terapeuta_id).toBe(terapeutaBId);

    // Terapeuta B tenta editar anotação do Terapeuta A -> 403 Forbidden
    const handlersEditarAnotacao = obterHandlersPaciente(anotacaoRoutes, '/paciente/:id', 'patch');
    const mockEditar = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: anotacaoTerapeutaAId },
      body: { conteudo: 'Tentativa de alterar nota do colega.' },
    });
    await executarPipelinePaciente(handlersEditarAnotacao, mockEditar.req, mockEditar.res);
    expect(mockEditar.getStatus()).toBe(403);
    expect(mockEditar.getJson().error).toContain('apenas o terapeuta autor');

    // Terapeuta B tenta excluir anotação do Terapeuta A -> 403 Forbidden
    const handlersDeletarAnotacao = obterHandlersPaciente(
      anotacaoRoutes,
      '/paciente/:id',
      'delete'
    );
    const mockDeletar = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: anotacaoTerapeutaAId },
    });
    await executarPipelinePaciente(handlersDeletarAnotacao, mockDeletar.req, mockDeletar.res);
    expect(mockDeletar.getStatus()).toBe(403);
    expect(mockDeletar.getJson().error).toContain('apenas o terapeuta autor');
  });

  // ==========================================================================
  // 5. Bloqueio de vinculação de terapeuta de outra clínica (403 Forbidden - RN04)
  // ==========================================================================
  it('5. Tentativa de vincular Terapeuta C (Clínica 2) ao Paciente X (Clínica 1) retorna 403 Forbidden (RN04)', async () => {
    const handlersVincular = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');
    const mockVincularC = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId },
      body: { terapeuta_id: terapeutaCId },
    });

    await executarPipelinePaciente(handlersVincular, mockVincularC.req, mockVincularC.res);
    expect(mockVincularC.getStatus()).toBe(403);
    expect(mockVincularC.getJson().error).toContain('clínicas diferentes');
  });

  // ==========================================================================
  // 6. Conflito ao vincular terapeuta já pertencente à equipe (409 Conflict)
  // ==========================================================================
  it('6. Tentativa de vincular Terapeuta B novamente (já vinculado ao Paciente X) retorna 409 Conflict', async () => {
    dbVinculos.push({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
      created_at: '2026-10-21T08:00:00.000Z',
    });

    const handlersVincular = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');
    const mockDuplicado = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId },
      body: { terapeuta_id: terapeutaBId },
    });

    await executarPipelinePaciente(handlersVincular, mockDuplicado.req, mockDuplicado.res);
    expect(mockDuplicado.getStatus()).toBe(409);
    expect(mockDuplicado.getJson().error).toContain('já está vinculado');
  });

  // ==========================================================================
  // 7. Validações 400 Bad Request e 404 Not Found no vínculo de terapeuta
  // ==========================================================================
  it('7. Tentativa de vincular com terapeuta_id ausente ou UUID inválido retorna 400, e terapeuta/paciente inexistente retorna 404', async () => {
    const handlersVincular = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');

    // terapeuta_id ausente -> 400
    const mockAusente = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId },
      body: {},
    });
    await executarPipelinePaciente(handlersVincular, mockAusente.req, mockAusente.res);
    expect(mockAusente.getStatus()).toBe(400);

    // terapeuta_id UUID inválido -> 400
    const mockUuidInvalido = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId },
      body: { terapeuta_id: 'uuid-invalido' },
    });
    await executarPipelinePaciente(handlersVincular, mockUuidInvalido.req, mockUuidInvalido.res);
    expect(mockUuidInvalido.getStatus()).toBe(400);

    // terapeuta inexistente -> 404
    const mockTerapeuta404 = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId },
      body: { terapeuta_id: terapeutaInexistenteId },
    });
    await executarPipelinePaciente(handlersVincular, mockTerapeuta404.req, mockTerapeuta404.res);
    expect(mockTerapeuta404.getStatus()).toBe(404);

    // paciente inexistente -> 404 (barrado pelo verificarVisibilidadePaciente)
    const mockPaciente404 = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteInexistenteId },
      body: { terapeuta_id: terapeutaBId },
    });
    await executarPipelinePaciente(handlersVincular, mockPaciente404.req, mockPaciente404.res);
    expect(mockPaciente404.getStatus()).toBe(404);
  });

  // ==========================================================================
  // 8, 9 e 10. Governança do Terapeuta Responsável (Líder) e Trava Anti-Órfão (409)
  // ==========================================================================
  it('8, 9 e 10. Governança do Líder: Terapeuta B (não Líder) é bloqueado com 403 ao tentar vincular ou desvincular; Terapeuta A (Líder) desvincula Terapeuta B (200); Terapeuta A único ativo é bloqueado pela trava anti-órfão (409)', async () => {
    dbVinculos.push({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
      created_at: '2026-10-21T08:00:00.000Z',
    });

    const handlersVincular = obterHandlersPaciente(pacienteRoutes, '/:id/terapeutas', 'post');
    const handlersDesvincular = obterHandlersPaciente(
      pacienteRoutes,
      '/:id/terapeutas/:terapeutaId',
      'delete'
    );

    // 8a. Terapeuta B (Especialista Vinculado, não Líder) tenta vincular Terapeuta D -> 403 Forbidden
    const mockBVincularBloqueado = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: pacienteXId },
      body: { terapeuta_id: terapeutaDId },
    });
    await executarPipelinePaciente(
      handlersVincular,
      mockBVincularBloqueado.req,
      mockBVincularBloqueado.res
    );
    expect(mockBVincularBloqueado.getStatus()).toBe(403);
    expect(mockBVincularBloqueado.getJson().error).toBe(
      'Acesso negado: apenas o Terapeuta Responsável (Líder) ou um SuperAdmin podem adicionar especialistas à equipe deste paciente.'
    );

    // 8b. Terapeuta B (Especialista Vinculado, não Líder) tenta desvincular vínculo da equipe -> 403 Forbidden
    const mockBDesvincularBloqueado = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      params: { id: pacienteXId, terapeutaId: terapeutaBId },
    });
    await executarPipelinePaciente(
      handlersDesvincular,
      mockBDesvincularBloqueado.req,
      mockBDesvincularBloqueado.res
    );
    expect(mockBDesvincularBloqueado.getStatus()).toBe(403);
    expect(mockBDesvincularBloqueado.getJson().error).toBe(
      'Acesso negado: apenas o Terapeuta Responsável (Líder) ou um SuperAdmin podem remover vínculos da equipe.'
    );

    // 9. Terapeuta A (Terapeuta Responsável Líder) desvincula Terapeuta B da equipe -> 200 OK
    const mockLiderRemoveB = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId, terapeutaId: terapeutaBId },
    });
    await executarPipelinePaciente(
      handlersDesvincular,
      mockLiderRemoveB.req,
      mockLiderRemoveB.res
    );
    expect(mockLiderRemoveB.getStatus()).toBe(200);
    expect(mockLiderRemoveB.getJson().data.vinculo).toEqual({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
      status: 'removido',
    });

    // 10. Prevenção anti-órfão: Terapeuta A (agora único especialista ativo) tenta desvincular a si mesmo -> 409 Conflict
    const mockAntiOrfaoA = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_A}` },
      params: { id: pacienteXId, terapeutaId: terapeutaAId },
    });
    await executarPipelinePaciente(handlersDesvincular, mockAntiOrfaoA.req, mockAntiOrfaoA.res);
    expect(mockAntiOrfaoA.getStatus()).toBe(409);
    expect(mockAntiOrfaoA.getJson().error).toBe(
      'Operação bloqueada: não é permitido remover o único especialista vinculado ao paciente. Vincule outro profissional da clínica antes de realizar a transferência.'
    );
  });

  // ==========================================================================
  // 11. SuperAdmin desvincula terapeuta mesmo com is_super_admin apenas no banco (200), mas recebe 409 no último ativo
  // ==========================================================================
  it('11. SuperAdmin consegue desvincular um terapeuta inativo X quando A continua ativo (200 OK, inclusive quando is_super_admin vem apenas do banco), mas recebe 409 Conflict se tentar remover o último terapeuta ativo', async () => {
    // Vincula o terapeuta inativo X ao Paciente X (enquanto A continua ativo)
    dbVinculos.push({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaInativoId,
      created_at: '2026-10-15T08:00:00.000Z',
    });

    const handlersDesvincular = obterHandlersPaciente(
      pacienteRoutes,
      '/:id/terapeutas/:terapeutaId',
      'delete'
    );

    // Tentativa de SuperAdmin remover Terapeuta A (único ATIVO, pois X é inativo) -> 409 Conflict!
    const mockAdminRemoveUnicoAtivo = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_ADMIN}` },
      params: { id: pacienteXId, terapeutaId: terapeutaAId },
    });
    await executarPipelinePaciente(
      handlersDesvincular,
      mockAdminRemoveUnicoAtivo.req,
      mockAdminRemoveUnicoAtivo.res
    );
    expect(mockAdminRemoveUnicoAtivo.getStatus()).toBe(409);

    // SuperAdmin (com flag is_super_admin vinda exclusivamente da tabela terapeuta no banco) remove o terapeuta inativo X -> 200 OK
    const mockAdminRemoveInativo = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_ADMIN_DB_ONLY}` },
      params: { id: pacienteXId, terapeutaId: terapeutaInativoId },
    });
    await executarPipelinePaciente(
      handlersDesvincular,
      mockAdminRemoveInativo.req,
      mockAdminRemoveInativo.res
    );
    expect(mockAdminRemoveInativo.getStatus()).toBe(200);
    expect(mockAdminRemoveInativo.getJson().data.vinculo.status).toBe('removido');
  });

  // ==========================================================================
  // 12. RN01: Sessões em modo_livre permanecem isoladas ao criador e nunca vazam
  // ==========================================================================
  it('12. RN01: Sessões em modo_livre permanecem isoladas ao criador e nunca vazam na listagem compartilhada do paciente ou de outros terapeutas', async () => {
    dbVinculos.push({
      paciente_id: pacienteXId,
      terapeuta_id: terapeutaBId,
      created_at: '2026-10-21T08:00:00.000Z',
    });

    const handlersSessoes = obterHandlersPaciente(sessaoRoutes, '/', 'get');

    // 12.1. Listagem compartilhada por pacienteId nunca inclui sessões modo_livre
    const mockCompartilhada = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      query: { pacienteId: pacienteXId },
    });
    await executarPipelinePaciente(
      handlersSessoes,
      mockCompartilhada.req,
      mockCompartilhada.res
    );
    expect(mockCompartilhada.getStatus()).toBe(200);
    const sessoesCompartilhadas = mockCompartilhada.getJson().data.sessoes;
    expect(sessoesCompartilhadas.every((s) => s.modo_sessao === MODO_SESSAO.SESSAO_CLINICA)).toBe(
      true
    );
    expect(sessoesCompartilhadas.some((s) => s.id === sessaoModoLivreAId)).toBe(false);

    // 12.2. Listagem combinando pacienteId + modo=modo_livre retorna lista vazia (RN01)
    const mockModoLivreComPaciente = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      query: { pacienteId: pacienteXId, modo: MODO_SESSAO.MODO_LIVRE },
    });
    await executarPipelinePaciente(
      handlersSessoes,
      mockModoLivreComPaciente.req,
      mockModoLivreComPaciente.res
    );
    expect(mockModoLivreComPaciente.getStatus()).toBe(200);
    expect(mockModoLivreComPaciente.getJson().data.sessoes).toEqual([]);

    // 12.3. Listagem geral de Terapeuta B (sem pacienteId) nunca expõe a sessão modo_livre de Terapeuta A
    const mockGeralB = criarMockReqResPaciente({
      headers: { authorization: `Bearer ${TOKEN_B}` },
      query: {},
    });
    await executarPipelinePaciente(handlersSessoes, mockGeralB.req, mockGeralB.res);
    expect(mockGeralB.getStatus()).toBe(200);
    const sessoesB = mockGeralB.getJson().data.sessoes;
    expect(sessoesB).toHaveLength(1);
    expect(sessoesB[0]?.id).toBe(sessaoClinicaBId);
  });
});
