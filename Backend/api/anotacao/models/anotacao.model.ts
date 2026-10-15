// ==============================================================================
// InTEA: Modelo da Tabela anotacao_clinica (Prontuário com Sessão Opcional)
// ==============================================================================
// Conformidade: RF16 (Anotações Clínicas), RF21 (Autoria JWT), RN04, RN05
// TypeScript Estrito: Sem 'any'
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';

export interface AnotacaoTerapeutaInfo {
  id: string;
  nome: string;
}

export interface AnotacaoClinica {
  id: string;
  terapeuta_id: string;
  paciente_id: string;
  sessao_id: string | null;
  conteudo: string;
  soft_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarAnotacaoDTO {
  terapeuta_id: string;
  paciente_id: string;
  sessao_id?: string | null;
  conteudo: string;
}

export interface AtualizarAnotacaoDTO {
  conteudo?: string;
  soft_delete?: boolean;
}

export class AnotacaoClinicaModel {
  /**
   * Records a new clinical note associated with a patient and optional session.
   *
   * @param dto - Data transfer object with note details (`terapeuta_id`, `paciente_id`, `sessao_id`, `conteudo`).
   * @returns Newly created clinical note record or null on failure.
   */
  static async criar(dto: CriarAnotacaoDTO): Promise<AnotacaoClinica | null> {
    try {
      const { data, error } = await supabase
        .from('anotacao_clinica')
        .insert({
          terapeuta_id: dto.terapeuta_id,
          paciente_id: dto.paciente_id,
          sessao_id: dto.sessao_id || null,
          conteudo: dto.conteudo.trim(),
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[AnotacaoClinicaModel] Erro ao criar anotação:', error);
        return null;
      }

      return data as AnotacaoClinica;
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Exceção ao criar anotação clínica:', err);
      return null;
    }
  }

  /**
   * Retrieves an active clinical note by its UUID.
   *
   * @param id - UUID of the clinical note.
   * @returns The clinical note record or null if not found or soft-deleted.
   */
  static async buscarPorId(id: string): Promise<AnotacaoClinica | null> {
    try {
      const { data, error } = await supabase
        .from('anotacao_clinica')
        .select('*')
        .eq('id', id)
        .eq('soft_delete', false)
        .maybeSingle();

      if (error || !data) return null;
      return data as AnotacaoClinica;
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Erro ao buscar anotação por ID:', err);
      return null;
    }
  }

  /**
   * Lists active clinical notes for a patient ordered by creation date descending.
   *
   * @param pacienteId - UUID of the patient.
   * @param incluirDeletadas - Whether to include soft-deleted records.
   * @param somenteSemSessao - Whether to filter only general patient notes (`sessao_id IS NULL`).
   * @returns Array of clinical note records.
   */
  static async listarPorPaciente(
    pacienteId: string,
    incluirDeletadas = false,
    somenteSemSessao = false
  ): Promise<AnotacaoClinica[]> {
    try {
      let query = supabase
        .from('anotacao_clinica')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false });

      if (!incluirDeletadas) {
        query = query.eq('soft_delete', false);
      }

      if (somenteSemSessao) {
        query = query.is('sessao_id', null);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('[AnotacaoClinicaModel] Erro ao listar anotações por paciente:', error);
        return [];
      }

      return data as AnotacaoClinica[];
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Exceção ao listar anotações por paciente:', err);
      return [];
    }
  }

  /**
   * Lists clinical notes associated with a specific session.
   *
   * @param sessaoId - UUID of the session.
   * @param incluirDeletadas - Whether to include soft-deleted records.
   * @returns Array of clinical note records.
   */
  static async listarPorSessao(sessaoId: string, incluirDeletadas = false): Promise<AnotacaoClinica[]> {
    try {
      let query = supabase
        .from('anotacao_clinica')
        .select('*')
        .eq('sessao_id', sessaoId);

      if (!incluirDeletadas) {
        query = query.eq('soft_delete', false);
      }

      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error || !data) {
        console.error('[AnotacaoClinicaModel] Erro ao listar anotações por sessão:', error);
        return [];
      }

      return data as AnotacaoClinica[];
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Exceção ao listar anotações por sessão:', err);
      return [];
    }
  }

  /**
   * Updates content or state of an active clinical note.
   *
   * @param id - UUID of the clinical note.
   * @param dto - Update data containing new content and/or soft delete flag.
   * @returns Updated clinical note record or null on failure.
   */
  static async atualizar(id: string, dto: AtualizarAnotacaoDTO): Promise<AnotacaoClinica | null> {
    try {
      const camposAtualizar: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.conteudo !== undefined) {
        camposAtualizar.conteudo = dto.conteudo.trim();
      }

      if (dto.soft_delete !== undefined) {
        camposAtualizar.soft_delete = dto.soft_delete;
      }

      const { data, error } = await supabase
        .from('anotacao_clinica')
        .update(camposAtualizar)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[AnotacaoClinicaModel] Erro ao atualizar anotação:', error);
        return null;
      }

      return data as AnotacaoClinica;
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Exceção ao atualizar anotação clínica:', err);
      return null;
    }
  }

  /**
   * Executes logical deletion (soft delete) of a clinical note (`soft_delete = true`, RN05).
   *
   * @param id - UUID of the clinical note.
   * @returns True if successfully marked as deleted, false otherwise.
   */
  static async softDelete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anotacao_clinica')
        .update({
          soft_delete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[AnotacaoClinicaModel] Erro ao executar soft delete:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Exceção ao executar soft delete na anotação:', err);
      return false;
    }
  }

  /**
   * Permanently deletes a clinical note from the database for development and test environments.
   *
   * @param id - UUID of the clinical note.
   * @returns True if successfully deleted, false otherwise.
   */
  static async deletarHard(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Hard delete proibido em ambiente de produção (RN05).');
    }

    try {
      const { error } = await supabase
        .from('anotacao_clinica')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[AnotacaoClinicaModel] Erro ao executar hard delete:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[AnotacaoClinicaModel] Exceção ao executar hard delete:', err);
      return false;
    }
  }
}
