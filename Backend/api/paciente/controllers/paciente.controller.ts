// ==============================================================================
// InTEA: Controller de Pacientes (Camada HTTP / Thin Controller)
// ==============================================================================
// Conformidade: RF10, RN04 (Visibilidade), RN05 (Soft Delete)
// Padrão Arquitetural: Envelope Pattern Categorizado e Sanitização Estrita
// ==============================================================================

import { Request, Response } from 'express';
import { CriarPacienteDTO, AtualizarPacienteDTO, FiltrosPacienteDTO, Paciente } from '../models/paciente.model.js';
import { PacienteService, PacienteServiceError } from '../services/paciente.service.js';
import { PacienteHistoricoService } from '../services/paciente-historico.service.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { obterMensagemErro } from '../../../core/utils/formatters.js';

// ==============================================================================
// Tipos de Sanitização de Saída (Zero any)
// ==============================================================================

export interface PacienteSanitizado {
  id: string;
  nome: string;
  data_nascimento: string;
  cpf: string | null;
  telefone: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  clinica_id: string | null;
  status_ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ResponsavelSanitizado {
  id?: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  parentesco: string | null;
  principal?: boolean;
}

export interface TerapeutaSanitizado {
  id: string;
  nome: string;
  email: string | null;
  telefone?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
}

/**
 * Sanitiza o registro de paciente expurgando campos aninhados ou sensíveis.
 */
function sanitizarPaciente(paciente: unknown): PacienteSanitizado | null {
  if (!paciente || typeof paciente !== 'object') return null;
  const p = paciente as Record<string, unknown>;
  return {
    id: String(p.id ?? ''),
    nome: String(p.nome ?? ''),
    data_nascimento: String(p.data_nascimento ?? ''),
    cpf: p.cpf !== undefined && p.cpf !== null ? String(p.cpf) : null,
    telefone: p.telefone !== undefined && p.telefone !== null ? String(p.telefone) : null,
    cep: p.cep !== undefined && p.cep !== null ? String(p.cep) : null,
    cidade: p.cidade !== undefined && p.cidade !== null ? String(p.cidade) : null,
    estado: p.estado !== undefined && p.estado !== null ? String(p.estado) : null,
    endereco: p.endereco !== undefined && p.endereco !== null ? String(p.endereco) : null,
    bairro: p.bairro !== undefined && p.bairro !== null ? String(p.bairro) : null,
    numero: p.numero !== undefined && p.numero !== null ? String(p.numero) : null,
    complemento: p.complemento !== undefined && p.complemento !== null ? String(p.complemento) : null,
    clinica_id: p.clinica_id !== undefined && p.clinica_id !== null ? String(p.clinica_id) : null,
    status_ativo: p.status_ativo !== false,
    ...(p.created_at ? { created_at: String(p.created_at) } : {}),
    ...(p.updated_at ? { updated_at: String(p.updated_at) } : {}),
  };
}

/**
 * Sanitiza dados do responsável vinculado ao paciente.
 */
function sanitizarResponsavel(r: unknown): ResponsavelSanitizado | null {
  if (!r || typeof r !== 'object') return null;
  const raw = ('responsavel' in r && r.responsavel && typeof r.responsavel === 'object')
    ? (r.responsavel as Record<string, unknown>)
    : (r as Record<string, unknown>);

  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : undefined,
    nome: String(raw.nome ?? ''),
    cpf: raw.cpf !== undefined && raw.cpf !== null ? String(raw.cpf) : null,
    telefone: raw.telefone !== undefined && raw.telefone !== null ? String(raw.telefone) : null,
    email: raw.email !== undefined && raw.email !== null ? String(raw.email) : null,
    parentesco: raw.parentesco !== undefined && raw.parentesco !== null ? String(raw.parentesco) : null,
    principal: Boolean(raw.principal ?? raw.is_principal ?? false),
  };
}

/**
 * Sanitiza dados do terapeuta vinculado à equipe multidisciplinar.
 */
function sanitizarTerapeuta(t: unknown): TerapeutaSanitizado | null {
  if (!t || typeof t !== 'object') return null;
  const raw = ('terapeuta' in t && t.terapeuta && typeof t.terapeuta === 'object')
    ? (t.terapeuta as Record<string, unknown>)
    : (t as Record<string, unknown>);

  return {
    id: String(raw.id ?? ''),
    nome: String(raw.nome ?? ''),
    email: raw.email !== undefined && raw.email !== null ? String(raw.email) : null,
    ...(raw.telefone !== undefined ? { telefone: raw.telefone !== null ? String(raw.telefone) : null } : {}),
    ...(raw.registro_profissional !== undefined ? { registro_profissional: raw.registro_profissional !== null ? String(raw.registro_profissional) : null } : {}),
    ...(raw.especialidade !== undefined ? { especialidade: raw.especialidade !== null ? String(raw.especialidade) : null } : {}),
  };
}

export class PacienteController {
  /**
   * Handles GET /api/paciente to list patients with optional filtering, search, and pagination.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "pacientes": [ ... ],
   *     "meta": { "total": number, "pagina": number, "limite": number, "total_paginas": number }
   *   },
   *   "message": "Pacientes listados com sucesso."
   * }
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const verTodosPacientes = req.query.all === 'true' || req.query.todos === 'true';
      const usuarioLogado = (req as AuthenticatedRequest).user;

      const filtros: FiltrosPacienteDTO = {
        incluirInativos: req.query.incluirInativos === 'true',
        nome: typeof req.query.nome === 'string' ? req.query.nome : undefined,
        cpf: typeof req.query.cpf === 'string' ? req.query.cpf : undefined,
        idadeMin: req.query.idadeMin !== undefined ? Number(req.query.idadeMin) : undefined,
        idadeMax: req.query.idadeMax !== undefined ? Number(req.query.idadeMax) : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
        terapeutaId: undefined,
      };

      const resultado = await PacienteService.listar(filtros, usuarioLogado, verTodosPacientes);

      const pacientesSanitizados = (resultado.data || [])
        .map((p) => sanitizarPaciente(p))
        .filter((p): p is PacienteSanitizado => p !== null);

      res.status(200).json({
        data: {
          pacientes: pacientesSanitizados,
          meta: {
            total: resultado.meta?.total ?? 0,
            pagina: resultado.meta?.page ?? 1,
            limite: resultado.meta?.limit ?? 10,
            total_paginas: resultado.meta?.totalPages ?? 1,
          },
        },
        message: 'Pacientes listados com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          detalhes: error.detalhes,
        });
        return;
      }
      console.error('[PacienteController.listar]', error);
      res.status(500).json({
        error: 'Erro interno ao listar pacientes.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id to retrieve a single patient by UUID with relations.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "paciente": { ... },
   *     "responsaveis": [ ... ],
   *     "dados_clinicos": { ... },
   *     "meta": { "total_responsaveis": number, "ultima_atualizacao": string }
   *   },
   *   "message": "Paciente recuperado com sucesso."
   * }
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const paciente = await PacienteService.buscarPorId(id);

      if (!paciente) {
        res.status(404).json({ error: 'Paciente não encontrado.' });
        return;
      }

      const pacienteSanitizado = sanitizarPaciente(paciente);
      const responsaveisSanitizados = Array.isArray(paciente.responsaveis)
        ? paciente.responsaveis.map((r) => sanitizarResponsavel(r)).filter((r): r is ResponsavelSanitizado => r !== null)
        : [];
      const dadosClinicos = (paciente as { dados_clinicos?: unknown }).dados_clinicos ?? {};

      res.status(200).json({
        data: {
          paciente: pacienteSanitizado,
          responsaveis: responsaveisSanitizados,
          dados_clinicos: dadosClinicos,
          meta: {
            total_responsaveis: responsaveisSanitizados.length,
            ultima_atualizacao: paciente.updated_at || paciente.created_at || new Date().toISOString(),
          },
        },
        message: 'Paciente recuperado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.buscarPorId]', error);
      res.status(500).json({ error: 'Erro interno ao buscar paciente.' });
    }
  }

  /**
   * Handles POST /api/paciente to create a new patient with sanitized demographic data.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "paciente": { ... },
   *     "responsavel": { ... } | null
   *   },
   *   "message": "Paciente cadastrado com sucesso."
   * }
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarPacienteDTO = req.body;
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const novoPaciente = await PacienteService.criar(dto, usuarioLogado);

      const pacienteSanitizado = sanitizarPaciente(novoPaciente);
      const responsavelSanitizado = Array.isArray(novoPaciente.responsaveis) && novoPaciente.responsaveis.length > 0
        ? sanitizarResponsavel(novoPaciente.responsaveis[0])
        : (dto.responsavel ? sanitizarResponsavel(dto.responsavel) : null);

      res.status(201).json({
        data: {
          paciente: pacienteSanitizado,
          responsavel: responsavelSanitizado,
        },
        message: 'Paciente cadastrado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }

      const msg = obterMensagemErro(error);
      const isDuplicate =
        msg.includes('duplicate key') ||
        msg.includes('violates unique constraint') ||
        msg.includes('chave duplicada') ||
        msg.includes('restrição de unicidade') ||
        msg.includes('Já existe um paciente') ||
        msg.includes('23505');

      if (isDuplicate) {
        res.status(409).json({
          error: msg.includes('ativo') ? msg : 'Já existe um paciente cadastrado com este CPF.',
        });
        return;
      }

      console.error('[PacienteController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao cadastrar paciente.', detalhes: msg });
    }
  }

  /**
   * Handles PUT / PATCH /api/paciente/:id to update fields of an existing patient.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "paciente": { ... }
   *   },
   *   "message": "Paciente atualizado com sucesso."
   * }
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarPacienteDTO = req.body;

      const pacienteAtualizado = await PacienteService.atualizar(id, dto);

      res.status(200).json({
        data: {
          paciente: sanitizarPaciente(pacienteAtualizado),
        },
        message: 'Paciente atualizado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }

      const msg = obterMensagemErro(error);
      const isDuplicate =
        msg.includes('duplicate key') ||
        msg.includes('violates unique constraint') ||
        msg.includes('chave duplicada') ||
        msg.includes('restrição de unicidade') ||
        msg.includes('23505');

      if (isDuplicate) {
        res.status(409).json({ error: 'Já existe outro paciente cadastrado com este CPF.' });
        return;
      }

      console.error('[PacienteController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar paciente.', detalhes: msg });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id applying soft deletion (RN05).
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "paciente": { ... }
   *   },
   *   "message": "Paciente desativado com sucesso (soft delete aplicado)."
   * }
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { paciente, jaInativo } = await PacienteService.desativar(id);

      res.status(200).json({
        data: {
          paciente: sanitizarPaciente(paciente),
        },
        message: jaInativo
          ? 'O paciente já se encontra inativo.'
          : 'Paciente desativado com sucesso (soft delete aplicado).',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.desativar]', error);
      res.status(500).json({ error: 'Erro interno ao desativar paciente.' });
    }
  }

  /**
   * Handles PATCH /api/paciente/:id/reativar to reactivate an inactive patient record.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "paciente": { ... }
   *   },
   *   "message": "Paciente reativado com sucesso."
   * }
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const pacienteReativado = await PacienteService.reativar(id);

      res.status(200).json({
        data: {
          paciente: sanitizarPaciente(pacienteReativado),
        },
        message: 'Paciente reativado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar paciente.' });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id/hard to permanently delete a patient (testing/dev).
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "paciente": { "id": string, "removido": true }
   *   },
   *   "message": "Paciente excluído fisicamente do banco com sucesso (hard delete para testes)."
   * }
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await PacienteService.deletarHard(id);

      res.status(200).json({
        data: {
          paciente: {
            id,
            removido: true,
          },
        },
        message: 'Paciente excluído fisicamente do banco com sucesso (hard delete para testes).',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.deletarHard]', error);
      res.status(500).json({
        error: obterMensagemErro(error) || 'Erro interno ao realizar exclusão física do paciente.',
      });
    }
  }

  /**
   * Handles POST /api/paciente/:id/terapeutas to associate a therapist with a patient.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "vinculo": { "paciente_id": string, "terapeuta_id": string }
   *   },
   *   "message": "Terapeuta vinculado ao paciente com sucesso."
   * }
   */
  static async vincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const { terapeuta_id } = req.body || {};

      if (!terapeuta_id || typeof terapeuta_id !== 'string') {
        res.status(400).json({ error: 'O campo "terapeuta_id" (UUID) é obrigatório.' });
        return;
      }

      await PacienteService.vincularTerapeuta(pacienteId, terapeuta_id);

      res.status(201).json({
        data: {
          vinculo: {
            paciente_id: pacienteId,
            terapeuta_id,
          },
        },
        message: 'Terapeuta vinculado ao paciente com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (msg.includes('não encontrado')) {
        res.status(404).json({ error: msg });
        return;
      }

      if (msg.includes('Bloqueio de segurança') || msg.includes('inativo')) {
        res.status(400).json({ error: msg });
        return;
      }

      console.error('[PacienteController.vincularTerapeuta]', error);
      res.status(500).json({
        error: 'Erro ao vincular terapeuta ao paciente.',
        detalhes: msg,
      });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id/terapeutas/:terapeutaId to unlink a therapist.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "vinculo": { "paciente_id": string, "terapeuta_id": string, "status": "removido" }
   *   },
   *   "message": "Vínculo do terapeuta com o paciente removido com sucesso."
   * }
   */
  static async desvincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const terapeutaId = String(req.params.terapeutaId);

      await PacienteService.desvincularTerapeuta(pacienteId, terapeutaId);

      res.status(200).json({
        data: {
          vinculo: {
            paciente_id: pacienteId,
            terapeuta_id: terapeutaId,
            status: 'removido',
          },
        },
        message: 'Vínculo do terapeuta com o paciente removido com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (msg.includes('não encontrado')) {
        res.status(404).json({ error: msg });
        return;
      }

      console.error('[PacienteController.desvincularTerapeuta]', error);
      res.status(500).json({
        error: 'Erro ao remover vínculo do terapeuta.',
        detalhes: msg,
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id/terapeutas to retrieve all linked therapists.
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "terapeutas": [ ... ],
   *     "meta": { "total": number }
   *   },
   *   "message": "Terapeutas vinculados listados com sucesso."
   * }
   */
  static async listarTerapeutas(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const terapeutas = await PacienteService.listarTerapeutas(pacienteId);

      const terapeutasSanitizados = (terapeutas || [])
        .map((t) => sanitizarTerapeuta(t))
        .filter((t): t is TerapeutaSanitizado => t !== null);

      res.status(200).json({
        data: {
          terapeutas: terapeutasSanitizados,
          meta: {
            total: terapeutasSanitizados.length,
          },
        },
        message: 'Terapeutas vinculados listados com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (msg.includes('não encontrado')) {
        res.status(404).json({ error: msg });
        return;
      }

      console.error('[PacienteController.listarTerapeutas]', error);
      res.status(500).json({
        error: 'Erro ao listar terapeutas vinculados.',
        detalhes: msg,
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id/historico to retrieve longitudinal patient history
   * with universal engagement metrics and game-specific metric series (RF15, RF19, RN01, RN02, RN04, RN05).
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "engajamento": { ... },
   *     "jogos": [ ... ],
   *     "meta": { ... }
   *   },
   *   "message": "Histórico geral de engajamento do paciente recuperado com sucesso."
   * }
   */
  static async buscarHistoricoGeral(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);

      const filtros = {
        dataInicio: typeof req.query.dataInicio === 'string' && req.query.dataInicio.trim() ? req.query.dataInicio.trim() : undefined,
        dataFim: typeof req.query.dataFim === 'string' && req.query.dataFim.trim() ? req.query.dataFim.trim() : undefined,
      };

      const resultado = await PacienteHistoricoService.buscarHistoricoGeral(pacienteId, filtros);

      res.status(200).json({
        data: {
          engajamento: resultado.engajamento,
          jogos: resultado.jogos,
          meta: resultado.meta,
        },
        message: 'Histórico geral de engajamento do paciente recuperado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          ...(typeof error.detalhes === 'object' && error.detalhes !== null ? error.detalhes : { detalhes: error.detalhes }),
        });
        return;
      }

      console.error('[PacienteController.buscarHistoricoGeral]', error);
      res.status(500).json({
        error: 'Erro interno ao consultar histórico geral do paciente.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id/historico/jogo/:jogoId to retrieve specific game metric series (RF15, RN02).
   *
   * Formato Canônico:
   * {
   *   "data": {
   *     "jogo": { ... },
   *     "metricas_declaradas": [ ... ],
   *     "series_temporais": [ ... ],
   *     "sessoes": [ ... ],
   *     "meta": { ... }
   *   },
   *   "message": "Histórico do jogo para o paciente recuperado com sucesso."
   * }
   */
  static async buscarHistoricoJogo(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const jogoId = String(req.params.jogoId);

      const filtros = {
        sessaoId: typeof req.query.sessaoId === 'string' && req.query.sessaoId.trim() ? req.query.sessaoId.trim() : undefined,
        dataInicio: typeof req.query.dataInicio === 'string' && req.query.dataInicio.trim() ? req.query.dataInicio.trim() : undefined,
        dataFim: typeof req.query.dataFim === 'string' && req.query.dataFim.trim() ? req.query.dataFim.trim() : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
      };

      const resultado = await PacienteHistoricoService.buscarHistoricoJogo(pacienteId, jogoId, filtros);

      res.status(200).json({
        data: {
          jogo: resultado.jogo,
          metricas_declaradas: resultado.metricas_declaradas,
          series_temporais: resultado.series_temporais,
          sessoes: resultado.sessoes,
          meta: resultado.meta,
        },
        message: 'Histórico do jogo para o paciente recuperado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          ...(typeof error.detalhes === 'object' && error.detalhes !== null ? error.detalhes : { detalhes: error.detalhes }),
        });
        return;
      }

      console.error('[PacienteController.buscarHistoricoJogo]', error);
      res.status(500).json({
        error: 'Erro interno ao consultar histórico do jogo para o paciente.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Alias de compatibilidade para consultas unificadas.
   */
  static async buscarHistorico(req: Request, res: Response): Promise<void> {
    return PacienteController.buscarHistoricoGeral(req, res);
  }
}
