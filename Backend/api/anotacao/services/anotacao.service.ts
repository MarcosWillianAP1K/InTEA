// ==============================================================================
// InTEA: Serviço de Regras de Negócio de Anotações Clínicas
// ==============================================================================
// Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria JWT), RN04, RN05
// Padrão de Camadas Limpas: Lógica de negócio pura isolada do Controller
// ==============================================================================

import { AnotacaoClinicaModel, AnotacaoClinica } from '../models/anotacao.model.js';

export interface RespostaServico<T = unknown> {
  sucesso: boolean;
  status: number;
  dados?: T;
  erro?: string;
}

export class AnotacaoService {
  /**
   * Cria uma anotação clínica geral de paciente (sem vínculo com sessão).
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
   * Cria uma anotação clínica vinculada a uma sessão específica.
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
   * Lista exclusivamente anotações clínicas de paciente (sessao_id IS NULL).
   */
  static async listarAnotacoesPaciente(pacienteId: string): Promise<RespostaServico<AnotacaoClinica[]>> {
    const lista = await AnotacaoClinicaModel.listarPorPaciente(pacienteId, false, true);
    return { sucesso: true, status: 200, dados: lista };
  }

  /**
   * Lista anotações clínicas vinculadas a uma sessão.
   */
  static async listarAnotacoesSessao(sessaoId: string): Promise<RespostaServico<AnotacaoClinica[]>> {
    const lista = await AnotacaoClinicaModel.listarPorSessao(sessaoId, false);
    return { sucesso: true, status: 200, dados: lista };
  }

  /**
   * Atualiza o conteúdo de uma anotação clínica ativa.
   * Regra estrita de autoria: somente o terapeuta autor pode alterar (RF21).
   * Whitelist estrita: aceita exclusivamente o campo 'conteudo', ignorando soft_delete ou IDs.
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
   * Aplica soft delete na anotação clínica (soft_delete = true), cumprindo RN05.
   * Regra estrita de autoria: somente o terapeuta autor pode excluir.
   */
  static async softDelete(
    anotacao: AnotacaoClinica,
    usuarioLogadoId: string
  ): Promise<RespostaServico<void>> {
    if (anotacao.terapeuta_id !== usuarioLogadoId) {
      return {
        sucesso: false,
        status: 403,
        erro: 'Acesso negado: apenas o terapeuta autor pode excluir esta anotação clínica.',
      };
    }

    const sucesso = await AnotacaoClinicaModel.softDelete(anotacao.id);
    if (!sucesso) {
      return { sucesso: false, status: 500, erro: 'Erro ao aplicar soft delete na anotação clínica.' };
    }

    return { sucesso: true, status: 204 };
  }

  /**
   * Executa hard delete (exclusão física) exclusivo para ambiente de desenvolvimento/testes.
   */
  static async hardDeleteDev(id: string): Promise<RespostaServico<void>> {
    try {
      const sucesso = await AnotacaoClinicaModel.deletarHard(id);
      if (!sucesso) {
        return { sucesso: false, status: 404, erro: 'Anotação não encontrada para exclusão física.' };
      }
      return { sucesso: true, status: 204 };
    } catch (err: any) {
      return { sucesso: false, status: 500, erro: err?.message || 'Erro ao executar hard delete.' };
    }
  }
}
