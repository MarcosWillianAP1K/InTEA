// ==============================================================================
// InTEA: Serviço de Pacientes (Camada de Domínio / Fat Service)
// ==============================================================================
// Conformidade: RF10, RN04 (Visibilidade Institucional), RN05 (Soft Delete)
// ==============================================================================

import {
  PacienteModel,
  Paciente,
  CriarPacienteDTO,
  AtualizarPacienteDTO,
  FiltrosPacienteDTO,
  RespostaListagemPaciente,
  ResponsavelVinculado,
  TerapeutaVinculado,
} from '../models/paciente.model.js';
import { TerapeutaModel } from '../../terapeuta/models/terapeuta.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';
import { CryptoService } from '../../../core/security/crypto.service.js';
import {
  validarUUID,
  validarCriarPacienteDTO,
  validarAtualizarPacienteDTO,
} from '../../../core/utils/validators.js';
import {
  formatarCPF,
  formatarCEP,
  formatarTelefone,
} from '../../../core/utils/formatters.js';

export class PacienteServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public detalhes?: unknown
  ) {
    super(message);
    this.name = 'PacienteServiceError';
  }
}

export class PacienteService {
  /**
   * Lists patients with search filters, pagination, and institutional visibility rules (RN04).
   *
   * @param filtros - Search, age, pagination, and active-status filters.
   * @param usuarioLogado - Authenticated user extracting clinician identity.
   * @param verTodosPacientes - If true and user is super admin, bypasses therapist link filtering.
   * @returns Paginated patient data and metadata.
   */
  static async listar(
    filtros: FiltrosPacienteDTO,
    usuarioLogado?: UsuarioAutenticado,
    verTodosPacientes: boolean = false
  ): Promise<RespostaListagemPaciente> {
    if (verTodosPacientes) {
      if (!usuarioLogado || !usuarioLogado.id) {
        throw new PacienteServiceError(
          'Acesso negado: apenas administradores podem visualizar todos os pacientes.',
          403
        );
      }

      let isSuperAdmin =
        usuarioLogado.is_super_admin === true ||
        usuarioLogado.user_metadata?.is_super_admin === true;

      let statusAtivo = (usuarioLogado as { status_ativo?: boolean }).status_ativo !== false;

      if (!isSuperAdmin) {
        const { data: terapeuta } = await supabase
          .from('terapeuta')
          .select('is_super_admin, status_ativo')
          .eq('id', usuarioLogado.id)
          .maybeSingle();

        if (terapeuta) {
          if (terapeuta.is_super_admin === true) {
            isSuperAdmin = true;
          }
          if (terapeuta.status_ativo === false) {
            statusAtivo = false;
          }
        }
      }

      if (!isSuperAdmin || !statusAtivo) {
        throw new PacienteServiceError(
          'Acesso negado: apenas administradores podem visualizar todos os pacientes.',
          403
        );
      }
      // Administrador autorizado: lista todos os pacientes da base (não injeta filtros.terapeutaId)
    } else if (usuarioLogado?.id) {
      // Regra RN04: Terapeutas comuns só visualizam seus próprios pacientes vinculados
      filtros.terapeutaId = usuarioLogado.id;
    }

    return await PacienteModel.listar(filtros);
  }

  /**
   * Retrieves a single patient by UUID and normalizes relation arrays.
   *
   * @param id - Patient UUID.
   * @returns Patient record or null if not found.
   */
  static async buscarPorId(id: string): Promise<Paciente | null> {
    if (!id || id === 'undefined') {
      throw new PacienteServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new PacienteServiceError('O parâmetro ID deve ser um UUID válido.', 400);
    }

    const paciente = await PacienteModel.buscarPorId(id);
    if (!paciente) {
      return null;
    }

    // Normalização segura sem `any`
    const responsaveisNormalizados: ResponsavelVinculado[] = Array.isArray(paciente.responsaveis)
      ? paciente.responsaveis.map((r: unknown) => {
          if (r && typeof r === 'object' && 'responsavel' in r) {
            return (r as { responsavel: ResponsavelVinculado }).responsavel;
          }
          return r as ResponsavelVinculado;
        })
      : [];

    const terapeutasNormalizados: TerapeutaVinculado[] = Array.isArray(paciente.terapeutas)
      ? paciente.terapeutas.map((t: unknown) => {
          if (t && typeof t === 'object' && 'terapeuta' in t) {
            return (t as { terapeuta: TerapeutaVinculado }).terapeuta;
          }
          return t as TerapeutaVinculado;
        })
      : [];

    // Decifragem segura em repouso de dados clínicos sensíveis (LGPD / RNF06)
    const pacienteComDadosClinicos = paciente as Paciente & {
      dados_clinicos?: {
        diagnostico_base?: string | null;
        observacoes_gerais?: string | null;
        [key: string]: unknown;
      } | null;
    };

    if (pacienteComDadosClinicos.dados_clinicos) {
      const dc = pacienteComDadosClinicos.dados_clinicos;
      if (typeof dc.diagnostico_base === 'string') {
        dc.diagnostico_base = CryptoService.decifrarSeCifrado(dc.diagnostico_base);
      }
      if (typeof dc.observacoes_gerais === 'string') {
        dc.observacoes_gerais = CryptoService.decifrarSeCifrado(dc.observacoes_gerais);
      }
    }

    return {
      ...paciente,
      responsaveis: responsaveisNormalizados,
      terapeutas: terapeutasNormalizados,
    };
  }

  /**
   * Creates a new patient record with sanitized demographic data, masks, and auto-linkage.
   *
   * @param dto - New patient payload data.
   * @param usuarioLogado - Optional authenticated user enforcing clinic isolation and author linkage.
   * @returns Newly created patient record.
   */
  static async criar(
    dto: CriarPacienteDTO,
    usuarioLogado?: UsuarioAutenticado
  ): Promise<Paciente> {
    // 1. Validação estrutural do payload
    const validacao = validarCriarPacienteDTO(dto);
    if (!validacao.valido) {
      throw new PacienteServiceError('Erro de validação nos dados do paciente.', 400, validacao.erros);
    }

    // 2. Isolamento Institucional e Anti-Spoofing de Clínica (RN04)
    if (usuarioLogado) {
      const isSuperAdmin =
        usuarioLogado.is_super_admin === true ||
        usuarioLogado.user_metadata?.is_super_admin === true;

      if (!isSuperAdmin) {
        const terapeuta = await TerapeutaModel.buscarPorId(usuarioLogado.id);
        if (!terapeuta || !terapeuta.status_ativo) {
          throw new PacienteServiceError('Acesso negado: terapeuta inexistente ou inativo.', 403);
        }
        dto.clinica_id = terapeuta.clinica_id;
      }
    }

    // 3. Normalização e aplicação de máscaras canônicas
    dto.cpf = formatarCPF(dto.cpf);
    if (dto.cep) dto.cep = formatarCEP(dto.cep);
    if (dto.telefone) dto.telefone = formatarTelefone(dto.telefone);

    if (dto.responsavel) {
      if (dto.responsavel.cpf) dto.responsavel.cpf = formatarCPF(dto.responsavel.cpf);
      if (dto.responsavel.telefone) dto.responsavel.telefone = formatarTelefone(dto.responsavel.telefone);
    }

    // 3.1. Cifragem simétrica AES-256-GCM para dados clínicos sensíveis em repouso (LGPD / RNF06)
    const dtoClinico = dto as CriarPacienteDTO & {
      dados_clinicos?: {
        diagnostico_base?: string | null;
        observacoes_gerais?: string | null;
        [key: string]: unknown;
      };
    };

    if (dtoClinico.dados_clinicos) {
      if (typeof dtoClinico.dados_clinicos.diagnostico_base === 'string') {
        dtoClinico.dados_clinicos.diagnostico_base = CryptoService.cifrarSeNaoCifrado(
          dtoClinico.dados_clinicos.diagnostico_base
        );
      }
      if (typeof dtoClinico.dados_clinicos.observacoes_gerais === 'string') {
        dtoClinico.dados_clinicos.observacoes_gerais = CryptoService.cifrarSeNaoCifrado(
          dtoClinico.dados_clinicos.observacoes_gerais
        );
      }
    }

    // 4. Persistência e auto-vínculo do criador
    if (usuarioLogado?.id) {
      return await PacienteModel.criar(dto, usuarioLogado.id);
    }
    return await PacienteModel.criar(dto);
  }

  /**
   * Updates demographic or contact fields of an existing patient.
   *
   * @param id - Patient UUID.
   * @param dto - Partial update fields.
   * @returns Updated patient record.
   */
  static async atualizar(id: string, dto: AtualizarPacienteDTO): Promise<Paciente> {
    if (!id || id === 'undefined') {
      throw new PacienteServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new PacienteServiceError('O parâmetro ID deve ser um UUID válido.', 400);
    }

    const validacao = validarAtualizarPacienteDTO(dto);
    if (!validacao.valido) {
      throw new PacienteServiceError('Erro de validação na atualização do paciente.', 400, validacao.erros);
    }

    // Normalização de máscaras
    if (dto.cpf) dto.cpf = formatarCPF(dto.cpf);
    if (dto.cep) dto.cep = formatarCEP(dto.cep);
    if (dto.telefone) dto.telefone = formatarTelefone(dto.telefone);

    const existente = await PacienteModel.buscarPorId(id);
    if (!existente) {
      throw new PacienteServiceError('Paciente não encontrado para atualização.', 404);
    }

    // Verificação de concorrência otimista (RF18)
    if (dto.ultimo_updated_at !== undefined) {
      const timestampRecebido = new Date(dto.ultimo_updated_at).getTime();
      if (isNaN(timestampRecebido)) {
        throw new PacienteServiceError(
          'Formato inválido para o campo ultimo_updated_at. Utilize formato ISO 8601.',
          400
        );
      }

      const timestampBancoIso = existente.updated_at || existente.created_at;
      if (timestampBancoIso) {
        const timestampBanco = new Date(timestampBancoIso).getTime();
        if (!isNaN(timestampBanco) && timestampBanco > timestampRecebido) {
          throw new PacienteServiceError(
            'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.',
            409,
            {
              updated_at_banco: timestampBancoIso,
              ultimo_updated_at_recebido: dto.ultimo_updated_at,
            }
          );
        }
      }
    }

    try {
      return await PacienteModel.atualizar(id, dto);
    } catch (err: unknown) {
      const errTyped = err as { statusCode?: number; status?: number; message?: string; detalhes?: unknown };
      if (errTyped?.statusCode === 409 || errTyped?.status === 409) {
        throw new PacienteServiceError(
          errTyped.message || 'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.',
          409,
          errTyped.detalhes
        );
      }
      throw err;
    }
  }

  /**
   * Soft deletes a patient (RN05: status_ativo = false).
   *
   * @param id - Patient UUID.
   * @returns Object indicating deactivated patient and whether it was already inactive.
   */
  static async desativar(id: string): Promise<{ paciente: Paciente; jaInativo: boolean }> {
    if (!id || id === 'undefined') {
      throw new PacienteServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new PacienteServiceError('O parâmetro ID deve ser um UUID válido.', 400);
    }

    const existente = await PacienteModel.buscarPorId(id);
    if (!existente) {
      throw new PacienteServiceError('Paciente não encontrado para desativação.', 404);
    }

    if (!existente.status_ativo) {
      return { paciente: existente, jaInativo: true };
    }

    const desativado = await PacienteModel.desativar(id);
    return { paciente: desativado, jaInativo: false };
  }

  /**
   * Reactivates an inactive patient record.
   *
   * @param id - Patient UUID.
   * @returns Reactivated patient.
   */
  static async reativar(id: string): Promise<Paciente> {
    if (!id || id === 'undefined') {
      throw new PacienteServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new PacienteServiceError('O parâmetro ID deve ser um UUID válido.', 400);
    }

    const existente = await PacienteModel.buscarPorId(id);
    if (!existente) {
      throw new PacienteServiceError('Paciente não encontrado para reativação.', 404);
    }

    return await PacienteModel.reativar(id);
  }

  /**
   * Permanently hard deletes a patient record (Dev/Testing only).
   *
   * @param id - Patient UUID.
   */
  static async deletarHard(id: string): Promise<void> {
    if (!id || id === 'undefined') {
      throw new PacienteServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new PacienteServiceError('O parâmetro ID deve ser um UUID válido.', 400);
    }

    const existente = await PacienteModel.buscarPorId(id);
    if (!existente) {
      throw new PacienteServiceError('Paciente não encontrado para exclusão física.', 404);
    }

    await PacienteModel.deletarHard(id);
  }

  /**
   * Associates a therapist with a patient (terapeuta_paciente link).
   *
   * @param pacienteId - Patient UUID.
   * @param terapeutaId - Therapist UUID.
   */
  static async vincularTerapeuta(pacienteId: string, terapeutaId: string): Promise<void> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('O ID do paciente deve ser um UUID válido.', 400);
    }

    if (!terapeutaId || !validarUUID(terapeutaId)) {
      throw new PacienteServiceError('O campo "terapeuta_id" deve ser um UUID válido.', 400);
    }

    await PacienteModel.vincularTerapeuta(pacienteId, terapeutaId);
  }

  /**
   * Removes association between a therapist and a patient.
   *
   * @param pacienteId - Patient UUID.
   * @param terapeutaId - Therapist UUID.
   */
  static async desvincularTerapeuta(pacienteId: string, terapeutaId: string): Promise<void> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('O parâmetro "id" deve ser um UUID válido.', 400);
    }

    if (!terapeutaId || !validarUUID(terapeutaId)) {
      throw new PacienteServiceError('O parâmetro "terapeutaId" deve ser um UUID válido.', 400);
    }

    await PacienteModel.desvincularTerapeuta(pacienteId, terapeutaId);
  }

  /**
   * Lists therapists linked to a specific patient.
   *
   * @param pacienteId - Patient UUID.
   * @returns Array of linked therapists.
   */
  static async listarTerapeutas(pacienteId: string): Promise<TerapeutaVinculado[]> {
    if (!pacienteId || !validarUUID(pacienteId)) {
      throw new PacienteServiceError('O parâmetro ID deve ser um UUID válido.', 400);
    }

    return (await PacienteModel.listarTerapeutasVinculados(pacienteId)) as TerapeutaVinculado[];
  }

  /**
   * Sanitiza e anonimiza identificadores do paciente para registro seguro em logs (RNF06).
   */
  static anonimizarParaLogs(dado: unknown): unknown {
    return CryptoService.anonimizarParaLogs(dado);
  }

  /**
   * Cifra campos clínicos sensíveis via AES-256-GCM em repouso (RNF06).
   */
  static cifrarDadoSensivel(texto: string): string {
    return CryptoService.cifrar(texto);
  }

  /**
   * Decifra campos clínicos sensíveis cifrados via AES-256-GCM em repouso (RNF06).
   */
  static decifrarDadoSensivel(texto: string): string {
    return CryptoService.decifrar(texto);
  }
}
