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
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';
import { validarTelefone, validarUUID } from '../../../core/utils/validators.js';
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
   * Lists registered therapists, normalizing areas_foco and enforcing clinic scope (RN04).
   *
   * @param incluirInativos - If true, includes soft-deleted therapists.
   * @param usuarioLogado - Optional authenticated user to scope list by clinic when not SuperAdmin.
   * @returns Array of therapists with normalized areas.
   */
  static async listar(
    incluirInativos: boolean = false,
    usuarioLogado?: UsuarioAutenticado
  ): Promise<Terapeuta[]> {
    const isSuperAdmin =
      usuarioLogado?.is_super_admin === true ||
      usuarioLogado?.user_metadata?.is_super_admin === true;

    let clinicaIdFiltro: string | null | undefined = undefined;

    if (usuarioLogado && !isSuperAdmin) {
      if (usuarioLogado.clinica_id !== undefined) {
        clinicaIdFiltro = usuarioLogado.clinica_id;
      } else {
        const perfil = await TerapeutaModel.buscarPorId(usuarioLogado.id);
        clinicaIdFiltro = perfil?.clinica_id ?? null;
      }
    }

    const terapeutas = await TerapeutaModel.listar(incluirInativos, clinicaIdFiltro);
    return terapeutas.map((t) => ({
      ...t,
      areas_foco: TerapeutaService.normalizarAreasFoco(t.areas_foco),
    }));
  }

  /**
   * Retrieves therapist details by UUID and validates institutional isolation (RN04).
   *
   * @param id - Therapist UUID.
   * @param usuarioLogado - Optional authenticated user to check clinic matching if not SuperAdmin/self.
   * @returns Therapist record with normalized areas or null if not found.
   */
  static async buscarPorId(
    id: string,
    usuarioLogado?: UsuarioAutenticado
  ): Promise<Terapeuta | null> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new TerapeutaServiceError('Identificador de terapeuta inválido: deve ser um UUID válido.', 400);
    }

    const terapeuta = await TerapeutaModel.buscarPorId(id);
    if (!terapeuta) {
      return null;
    }

    if (usuarioLogado) {
      const isSuperAdmin =
        usuarioLogado.is_super_admin === true ||
        usuarioLogado.user_metadata?.is_super_admin === true;

      const isProprioTerapeuta = usuarioLogado.id === id;

      if (!isSuperAdmin && !isProprioTerapeuta) {
        let solicitanteClinicaId = usuarioLogado.clinica_id;
        if (solicitanteClinicaId === undefined) {
          const solicitante = await TerapeutaModel.buscarPorId(usuarioLogado.id);
          solicitanteClinicaId = solicitante?.clinica_id;
        }

        if (
          !solicitanteClinicaId ||
          !terapeuta.clinica_id ||
          solicitanteClinicaId !== terapeuta.clinica_id
        ) {
          throw new TerapeutaServiceError(
            'Acesso negado: o terapeuta pertence a uma instituição clínica diferente.',
            403
          );
        }
      }
    }

    return {
      ...terapeuta,
      areas_foco: TerapeutaService.normalizarAreasFoco(terapeuta.areas_foco),
    };
  }

  /**
   * Retrieves full profile of the authenticated therapist with clinic details and normalized focus areas.
   *
   * @param usuarioLogado - Authenticated user info.
   * @returns Object containing therapist data, clinic data, and focus areas.
   */
  static async obterPerfil(usuarioLogado?: UsuarioAutenticado): Promise<{
    terapeuta: Omit<Terapeuta, 'areas_foco'>;
    clinica: { id: string; nome: string; cnpj: string | null } | null;
    areas_foco: AreaFoco[];
  }> {
    if (!usuarioLogado || !usuarioLogado.id) {
      throw new TerapeutaServiceError('Usuário autenticado obrigatório para consultar o perfil.', 401);
    }

    const terapeuta = await TerapeutaModel.buscarPorId(usuarioLogado.id);
    if (!terapeuta) {
      throw new TerapeutaServiceError('Perfil de terapeuta não encontrado.', 404);
    }

    let clinica: { id: string; nome: string; cnpj: string | null } | null = null;
    if (terapeuta.clinica_id) {
      clinica = await TerapeutaModel.buscarClinicaPorId(terapeuta.clinica_id);
    }

    const areasNormalizadas = TerapeutaService.normalizarAreasFoco(terapeuta.areas_foco);
    const { areas_foco, ...terapeutaSemAreas } = terapeuta;

    return {
      terapeuta: terapeutaSemAreas,
      clinica,
      areas_foco: areasNormalizadas,
    };
  }

  /**
   * Lists patients linked to a therapist (terapeuta_paciente), enforcing clinic boundaries (RN04).
   *
   * @param terapeutaId - Target therapist UUID.
   * @param usuarioLogado - Authenticated user performing the request.
   * @returns Array of links containing patient details.
   */
  static async listarPacientesVinculados(
    terapeutaId: string,
    usuarioLogado?: UsuarioAutenticado
  ): Promise<Array<{
    terapeuta_id: string;
    paciente_id: string;
    created_at: string;
    paciente?: unknown;
  }>> {
    if (!terapeutaId || terapeutaId === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(terapeutaId)) {
      throw new TerapeutaServiceError('Identificador de terapeuta inválido: deve ser um UUID válido.', 400);
    }

    const terapeuta = await TerapeutaModel.buscarPorId(terapeutaId);
    if (!terapeuta) {
      throw new TerapeutaServiceError('Terapeuta não encontrado.', 404);
    }

    if (usuarioLogado) {
      const isSuperAdmin =
        usuarioLogado.is_super_admin === true ||
        usuarioLogado.user_metadata?.is_super_admin === true;

      const isProprio = usuarioLogado.id === terapeutaId;

      if (!isSuperAdmin && !isProprio) {
        let solicitanteClinicaId = usuarioLogado.clinica_id;
        if (solicitanteClinicaId === undefined) {
          const solicitante = await TerapeutaModel.buscarPorId(usuarioLogado.id);
          solicitanteClinicaId = solicitante?.clinica_id;
        }

        if (
          !solicitanteClinicaId ||
          !terapeuta.clinica_id ||
          solicitanteClinicaId !== terapeuta.clinica_id
        ) {
          throw new TerapeutaServiceError(
            'Acesso negado: o terapeuta pertence a uma instituição clínica diferente.',
            403
          );
        }
      }
    }

    return await TerapeutaModel.listarPacientesVinculados(terapeutaId);
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
   * Updates therapist data with security hardening and attribute sanitization.
   *
   * @param id - Therapist UUID.
   * @param dto - Update fields.
   * @param usuarioLogado - Optional authenticated user enforcing SuperAdmin checks and anti-IDOR.
   * @returns Updated therapist with normalized areas.
   */
  static async atualizar(
    id: string,
    dto: AtualizarTerapeutaDTO,
    usuarioLogado?: UsuarioAutenticado
  ): Promise<Terapeuta> {
    if (!id || id === 'undefined') {
      throw new TerapeutaServiceError('O parâmetro ID é obrigatório.', 400);
    }

    if (!validarUUID(id)) {
      throw new TerapeutaServiceError('Identificador de terapeuta inválido: deve ser um UUID válido.', 400);
    }

    const existente = await TerapeutaModel.buscarPorId(id);
    if (!existente) {
      throw new TerapeutaServiceError('Terapeuta não encontrado para atualização.', 404);
    }

    if (usuarioLogado) {
      const isSuperAdmin =
        usuarioLogado.is_super_admin === true ||
        usuarioLogado.user_metadata?.is_super_admin === true;

      if (!isSuperAdmin) {
        const dtoObj = dto as Record<string, unknown>;

        const tentaAlterarClinica =
          dto.clinica_id !== undefined && dto.clinica_id !== existente.clinica_id;
        const tentaAlterarStatus =
          dto.status_ativo !== undefined && dto.status_ativo !== existente.status_ativo;
        const tentaAlterarAdmin =
          dtoObj.is_super_admin !== undefined &&
          dtoObj.is_super_admin !== existente.is_super_admin;
        const tentaAlterarEmail =
          dtoObj.email !== undefined && dtoObj.email !== existente.email;

        if (
          tentaAlterarClinica ||
          tentaAlterarStatus ||
          tentaAlterarAdmin ||
          tentaAlterarEmail
        ) {
          throw new TerapeutaServiceError(
            'Acesso negado: apenas administradores podem alterar vínculos institucionais, status ativo, privilégios ou e-mail.',
            403
          );
        }

        if (usuarioLogado.id !== id) {
          throw new TerapeutaServiceError(
            'Acesso negado: você não tem permissão para alterar recursos de outro usuário.',
            403
          );
        }

        // Sanitizar o payload removendo essas propriedades restritas
        delete dto.clinica_id;
        delete dto.status_ativo;
        delete dtoObj.is_super_admin;
        delete dtoObj.email;
      }
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

    if (!validarUUID(id)) {
      throw new TerapeutaServiceError('Identificador de terapeuta inválido: deve ser um UUID válido.', 400);
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

    if (!validarUUID(id)) {
      throw new TerapeutaServiceError('Identificador de terapeuta inválido: deve ser um UUID válido.', 400);
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

    if (!validarUUID(id)) {
      throw new TerapeutaServiceError('Identificador de terapeuta inválido: deve ser um UUID válido.', 400);
    }

    const existente = await TerapeutaModel.buscarPorId(id);
    if (!existente) {
      throw new TerapeutaServiceError('Terapeuta não encontrado para exclusão física.', 404);
    }

    await TerapeutaModel.deletarHard(id);
  }
}
