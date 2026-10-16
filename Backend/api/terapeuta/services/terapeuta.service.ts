// ==============================================================================
// InTEA: Serviço de Terapeutas (Camada de Domínio / Fat Service)
// ==============================================================================
// Conformidade: RF21 (Autoria), RN04 (Vínculo), RN05 (Soft Delete)
// ==============================================================================

import {
  TerapeutaModel,
  Terapeuta,
  CriarTerapeutaDTO,
  AtualizarTerapeutaDTO,
  AreaFoco,
} from '../models/terapeuta.model.js';
import { validarTelefone } from '../../../core/utils/validators.js';
import { formatarTelefone } from '../../../core/utils/formatters.js';

export class TerapeutaServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public detalhes?: unknown
  ) {
    super(message);
    this.name = 'TerapeutaServiceError';
  }
}

export class TerapeutaService {
  /**
   * Normalizes areas_foco relation array from Supabase.
   *
   * @param areas - Raw relation array.
   * @returns Clean array of AreaFoco.
   */
  private static normalizarAreasFoco(areas: unknown): AreaFoco[] {
    if (!Array.isArray(areas)) return [];
    return areas.map((item: unknown) => {
      if (item && typeof item === 'object' && 'areas_foco' in item) {
        return (item as { areas_foco: AreaFoco }).areas_foco;
      }
      return item as AreaFoco;
    });
  }

  /**
   * Lists registered therapists, normalizing areas_foco.
   *
   * @param incluirInativos - If true, includes soft-deleted therapists.
   * @returns Array of therapists with normalized areas.
   */
  static async listar(incluirInativos: boolean = false): Promise<Terapeuta[]> {
    const terapeutas = await TerapeutaModel.listar(incluirInativos);
    return terapeutas.map((t) => ({
      ...t,
      areas_foco: TerapeutaService.normalizarAreasFoco(t.areas_foco),
    }));
  }

  /**
   * Retrieves therapist details by UUID.
   *
   * @param id - Therapist UUID.
   * @returns Therapist record with normalized areas or null if not found.
   */
  static async buscarPorId(id: string): Promise<Terapeuta | null> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    const terapeuta = await TerapeutaModel.buscarPorId(id);
    if (!terapeuta) {
      return null;
    }

    return {
      ...terapeuta,
      areas_foco: TerapeutaService.normalizarAreasFoco(terapeuta.areas_foco),
    };
  }

  /**
   * Creates a new therapist and provisions Auth credentials.
   *
   * @param dto - Therapist payload.
   * @returns Created therapist.
   */
  static async criar(dto: CriarTerapeutaDTO): Promise<Terapeuta> {
    if (!dto.nome || dto.nome.trim() === '') {
      throw new TerapeutaServiceError('O campo "nome" é obrigatório.', 400);
    }

    if (!dto.email || dto.email.trim() === '') {
      throw new TerapeutaServiceError('O campo "email" é obrigatório.', 400);
    }

    if (!dto.password || dto.password.length < 6) {
      throw new TerapeutaServiceError('O campo "password" é obrigatório e deve ter no mínimo 6 caracteres.', 400);
    }

    if (dto.telefone && typeof dto.telefone === 'string' && dto.telefone.trim() !== '') {
      if (!validarTelefone(dto.telefone)) {
        throw new TerapeutaServiceError(
          'O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).',
          400
        );
      }
      dto.telefone = formatarTelefone(dto.telefone);
    }

    return await TerapeutaModel.criar(dto);
  }

  /**
   * Updates therapist data.
   *
   * @param id - Therapist UUID.
   * @param dto - Update fields.
   * @returns Updated therapist with normalized areas.
   */
  static async atualizar(id: string, dto: AtualizarTerapeutaDTO): Promise<Terapeuta> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    const existente = await TerapeutaModel.buscarPorId(id);
    if (!existente) {
      throw new TerapeutaServiceError('Terapeuta não encontrado para atualização.', 404);
    }

    if (dto.telefone !== undefined && dto.telefone !== null && dto.telefone.trim() !== '') {
      if (!validarTelefone(dto.telefone)) {
        throw new TerapeutaServiceError(
          'O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).',
          400
        );
      }
      dto.telefone = formatarTelefone(dto.telefone);
    }

    const atualizado = await TerapeutaModel.atualizar(id, dto);
    if (!atualizado) {
      throw new TerapeutaServiceError('Erro ao atualizar dados do terapeuta.', 500);
    }

    return {
      ...atualizado,
      areas_foco: TerapeutaService.normalizarAreasFoco(atualizado.areas_foco),
    };
  }

  /**
   * Soft deletes a therapist account (RN05: status_ativo = false).
   *
   * @param id - Therapist UUID.
   * @returns Object with deactivated record and whether it was already inactive.
   */
  static async desativar(id: string): Promise<{ terapeuta: Terapeuta; jaInativo: boolean }> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    const existente = await TerapeutaModel.buscarPorId(id);
    if (!existente) {
      throw new TerapeutaServiceError('Terapeuta não encontrado para desativação.', 404);
    }

    if (!existente.status_ativo) {
      return { terapeuta: existente, jaInativo: true };
    }

    const desativado = await TerapeutaModel.desativar(id);
    if (!desativado) {
      throw new TerapeutaServiceError('Erro ao desativar terapeuta.', 500);
    }

    return { terapeuta: desativado, jaInativo: false };
  }

  /**
   * Reactivates an inactive therapist.
   *
   * @param id - Therapist UUID.
   * @returns Reactivated therapist.
   */
  static async reativar(id: string): Promise<Terapeuta> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    const existente = await TerapeutaModel.buscarPorId(id);
    if (!existente) {
      throw new TerapeutaServiceError('Terapeuta não encontrado para reativação.', 404);
    }

    const reativado = await TerapeutaModel.reativar(id);
    if (!reativado) {
      throw new TerapeutaServiceError('Erro ao reativar terapeuta.', 500);
    }

    return reativado;
  }

  /**
   * Permanently hard deletes a therapist (testing/dev only).
   *
   * @param id - Therapist UUID.
   */
  static async deletarHard(id: string): Promise<void> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    const existente = await TerapeutaModel.buscarPorId(id);
    if (!existente) {
      throw new TerapeutaServiceError('Terapeuta não encontrado para exclusão física.', 404);
    }

    await TerapeutaModel.deletarHard(id);
  }
}
