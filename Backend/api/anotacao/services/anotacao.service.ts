// ==============================================================================
// InTEA: Serviço de Regras de Negócio de Anotações Clínicas
// ==============================================================================
// Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria JWT), RN04, RN05
// Padrão de Camadas Limpas: Lógica de negócio pura isolada do Controller
// ==============================================================================

import { AnotacaoClinicaModel, AnotacaoClinica } from '../models/anotacao.model.js';
import { validarUUID } from '../../../core/utils/validators.js';

export interface RespostaServico<T = unknown> {
  sucesso: boolean;
  status: number;
  dados?: T;
  erro?: string;
}

export class AnotacaoService {
  /**
   * Creates a general patient clinical note (without session linkage).
   *
   * @param terapeutaId - UUID of the authoring therapist.
   * @param pacienteId - UUID of the target patient.
   * @param conteudo - Textual content of the clinical note.
   * @returns Service response containing the created clinical note record.
   */
  static async criarAnotacaoPaciente(
    terapeutaId: string,
    pacienteId: string,
    conteudo: string
  ): Promise<RespostaServico<AnotacaoClinica>> {
    const conteudoLimpo = (conteudo || '').trim();
    if (!conteudoLimpo) {
      return { sucesso: false, status: 400, erro: 'O conteúdo da anotação clínica é obrigatório.' };
    }

    const novaAnotacao = await AnotacaoClinicaModel.criar({
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      sessao_id: null,
      conteudo: conteudoLimpo,
    });

    if (!novaAnotacao) {
      return { sucesso: false, status: 500, erro: 'Erro ao persistir anotação clínica no banco de dados.' };
    }

    return { sucesso: true, status: 201, dados: novaAnotacao };
  }

  /**
   * Creates a clinical note linked to a specific session.
   *
   * @param terapeutaId - UUID of the authoring therapist.
   * @param sessaoId - UUID of the target clinical session.
   * @param pacienteId - UUID of the target patient.
   * @param conteudo - Textual content of the clinical note.
   * @returns Service response containing the created clinical note record.
   */
  static async criarAnotacaoSessao(
    terapeutaId: string,
    sessaoId: string,
    pacienteId: string,
    conteudo: string
  ): Promise<RespostaServico<AnotacaoClinica>> {
    const conteudoLimpo = (conteudo || '').trim();
    if (!conteudoLimpo) {
      return { sucesso: false, status: 400, erro: 'O conteúdo da anotação clínica é obrigatório.' };
    }

    const novaAnotacao = await AnotacaoClinicaModel.criar({
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      sessao_id: sessaoId,
      conteudo: conteudoLimpo,
    });

    if (!novaAnotacao) {
      return { sucesso: false, status: 500, erro: 'Erro ao persistir anotação clínica no banco de dados.' };
    }

    return { sucesso: true, status: 201, dados: novaAnotacao };
  }

  /**
   * Lists exclusively general clinical notes for a patient (`sessao_id IS NULL`).
   *
   * @param pacienteId - UUID of the patient.
   * @returns Service response containing the array of clinical notes.
   */
  static async listarAnotacoesPaciente(pacienteId: string): Promise<RespostaServico<AnotacaoClinica[]>> {
    const lista = await AnotacaoClinicaModel.listarPorPaciente(pacienteId, false, true);
    return { sucesso: true, status: 200, dados: lista };
  }

  /**
   * Lists clinical notes linked to a specific session.
   *
   * @param sessaoId - UUID of the session.
   * @returns Service response containing the array of clinical notes.
   */
  static async listarAnotacoesSessao(sessaoId: string): Promise<RespostaServico<AnotacaoClinica[]>> {
    const lista = await AnotacaoClinicaModel.listarPorSessao(sessaoId, false);
    return { sucesso: true, status: 200, dados: lista };
  }

  /**
   * Updates the content of an active clinical note, enforcing author ownership (RF21).
   *
   * @param anotacao - Existing clinical note record.
   * @param usuarioLogadoId - UUID of the authenticated user.
   * @param novoConteudo - Updated textual content.
   * @returns Service response containing the updated clinical note record.
   */
  static async atualizarConteudo(
    anotacao: AnotacaoClinica,
    usuarioLogadoId: string,
    novoConteudo: string
  ): Promise<RespostaServico<AnotacaoClinica>> {
    // Validação estrita de autoria
    if (anotacao.terapeuta_id !== usuarioLogadoId) {
      return {
        sucesso: false,
        status: 403,
        erro: 'Acesso negado: apenas o terapeuta autor pode editar esta anotação clínica.',
      };
    }

    const conteudoLimpo = (novoConteudo || '').trim();
    if (!conteudoLimpo) {
      return { sucesso: false, status: 400, erro: 'O conteúdo da anotação não pode ser vazio.' };
    }

    const atualizada = await AnotacaoClinicaModel.atualizar(anotacao.id, {
      conteudo: conteudoLimpo,
    });

    if (!atualizada) {
      return { sucesso: false, status: 500, erro: 'Erro ao atualizar anotação clínica.' };
    }

    return { sucesso: true, status: 200, dados: atualizada };
  }

  /**
   * Retrieves a clinical note by its UUID.
   *
   * @param id - UUID of the clinical note.
   * @returns Service response containing the clinical note record.
   */
  static async buscarPorId(id: string): Promise<RespostaServico<AnotacaoClinica>> {
    if (!id || !validarUUID(id)) {
      return { sucesso: false, status: 400, erro: 'ID inválido. Forneça um UUID válido.' };
    }

    const anotacao = await AnotacaoClinicaModel.buscarPorId(id);
    if (!anotacao) {
      return { sucesso: false, status: 404, erro: 'Anotação clínica não encontrada.' };
    }

    return { sucesso: true, status: 200, dados: anotacao };
  }

  /**
   * Applies logical soft delete to a clinical note (`soft_delete = true`), preserving history (RN05).
   * Validates strict author ownership (RF21).
   *
   * @param alvo - Existing clinical note record or its UUID.
   * @param usuarioLogadoId - UUID of the authenticated user.
   * @returns Service response with HTTP status 200 and deactivated clinical note on success.
   */
  static async softDelete(
    alvo: string | AnotacaoClinica,
    usuarioLogadoId: string
  ): Promise<RespostaServico<AnotacaoClinica>> {
    let anotacao: AnotacaoClinica | null = null;

    if (typeof alvo === 'string') {
      if (!alvo || !validarUUID(alvo)) {
        return { sucesso: false, status: 400, erro: 'ID inválido. Forneça um UUID válido.' };
      }
      anotacao = await AnotacaoClinicaModel.buscarPorId(alvo);
      if (!anotacao) {
        return { sucesso: false, status: 404, erro: 'Anotação clínica não encontrada.' };
      }
    } else {
      anotacao = alvo;
    }

    if (anotacao.terapeuta_id !== usuarioLogadoId) {
      return {
        sucesso: false,
        status: 403,
        erro: 'Acesso negado: apenas o terapeuta autor pode inativar esta anotação clínica.',
      };
    }

    const sucesso = await AnotacaoClinicaModel.softDelete(anotacao.id);
    if (!sucesso) {
      return { sucesso: false, status: 500, erro: 'Erro ao aplicar soft delete na anotação clínica.' };
    }

    const anotacaoDesativada: AnotacaoClinica = {
      ...anotacao,
      soft_delete: true,
      updated_at: new Date().toISOString(),
    };

    return { sucesso: true, status: 200, dados: anotacaoDesativada };
  }

  /**
   * Performs physical hard delete for development and testing environments.
   *
   * @param id - UUID of the note to permanently delete.
   * @returns Service response with HTTP status 204 on success.
   */
  static async hardDeleteDev(id: string): Promise<RespostaServico<void>> {
    try {
      const sucesso = await AnotacaoClinicaModel.deletarHard(id);
      if (!sucesso) {
        return { sucesso: false, status: 404, erro: 'Anotação não encontrada para exclusão física.' };
      }
      return { sucesso: true, status: 204 };
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao executar hard delete.';
      return { sucesso: false, status: 500, erro: mensagem };
    }
  }
}
