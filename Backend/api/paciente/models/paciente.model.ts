import { supabase } from '../../../core/supabase/supabase.client.js';

// ==============================================================================
// 1. INTERFACES E TIPAGENS (TypeScript)
// ==============================================================================

/**
 * Representa a entidade Paciente exatamente como mapeada no banco de dados Supabase.
 */
export interface Paciente {
  id: string;                      // UUID gerado automaticamente (gen_random_uuid())
  nome: string;                    // Nome completo do paciente (NOT NULL)
  data_nascimento: string;         // Data de nascimento no formato ISO ("YYYY-MM-DD")
  status_ativo: boolean;           // Controle de Soft Delete (padrão true)
  created_at: string;              // Timestamp de cadastro
  updated_at: string;              // Timestamp da última atualização
  clinica_id: string | null;       // UUID da clínica (chave estrangeira)
  telefone: string | null;         // Telefone de contato
  cpf: string | null;              // CPF único do paciente
  cep: string | null;              // CEP residencial
  cidade: string | null;           // Cidade de residência
  estado: string | null;           // Estado / UF
  endereco: string | null;         // Logradouro / Rua / Avenida
  bairro: string | null;           // Bairro
  numero: string | null;           // Número da residência
  complemento: string | null;      // Complemento (apto, bloco, casa 2, etc.)
}

/**
 * DTO para criação de paciente (POST /api/pacientes).
 * Contém os campos que o Controller recebe na requisição para cadastrar um paciente.
 */
export interface CriarPacienteDTO {
  nome: string;
  data_nascimento: string;
  cpf: string;
  clinica_id?: string | null;
  telefone?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
}

/**
 * DTO para atualização de paciente (PUT /api/pacientes/:id).
 * Todos os campos são opcionais (PATCH/PUT parcial).
 * Campos de auditoria e identificadores (id, created_at) NÃO podem ser alterados pelo cliente.
 */
export interface AtualizarPacienteDTO {
  nome?: string;
  data_nascimento?: string;
  clinica_id?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  status_ativo?: boolean;
}

// ==============================================================================
// 2. MODEL: PacienteModel
// Camada de acesso a dados (Supabase) e regras de persistência da feature de pacientes
// ==============================================================================

export class PacienteModel {

  /**
   * Lista pacientes cadastrados.
   * Por padrão, filtra apenas pacientes ativos (RN05 / Soft Delete).
   * 
   * @param incluirInativos - Se true, lista inclusive os pacientes desativados logicamente.
   */
  static async listar(incluirInativos: boolean = false): Promise<Paciente[]> {
    let query = supabase
      .from('paciente')
      .select('*')
      .order('nome', { ascending: true });

    // Regra: Na listagem padrão, pacientes inativados não aparecem
    if (!incluirInativos) {
      query = query.eq('status_ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar pacientes no banco: ${error.message}`);
    }

    return (data as Paciente[]) || [];
  }

  /**
   * Busca um paciente específico pelo seu identificador UUID.
   * 
   * @param id - UUID do paciente
   * @returns O paciente encontrado ou null caso não exista
   */
  static async buscarPorId(id: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from('paciente')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar paciente por ID: ${error.message}`);
    }

    return (data as Paciente) || null;
  }

  /**
   * Cadastra um novo paciente no banco de dados.
   * Garante que o status_ativo seja sempre inicializado como true.
   * 
   * @param dto - Dados validados para cadastro do paciente
   */
  static async criar(dto: CriarPacienteDTO): Promise<Paciente> {
    const payload = {
      nome: dto.nome,
      data_nascimento: dto.data_nascimento,
      clinica_id: dto.clinica_id ?? null,
      telefone: dto.telefone ?? null,
      cpf: dto.cpf,
      cep: dto.cep ?? null,
      cidade: dto.cidade ?? null,
      estado: dto.estado ?? null,
      endereco: dto.endereco ?? null,
      bairro: dto.bairro ?? null,
      numero: dto.numero ?? null,
      complemento: dto.complemento ?? null,
      status_ativo: true, // Garante que novo paciente nasce ativo
    };

    const { data, error } = await supabase
      .from('paciente')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao inserir paciente no banco: ${error.message}`);
    }

    return data as Paciente;
  }

  /**
   * Atualiza os dados de um paciente existente.
   * Atualiza automaticamente o timestamp de updated_at.
   * 
   * @param id - UUID do paciente
   * @param dto - Campos a serem atualizados
   */
  static async atualizar(id: string, dto: AtualizarPacienteDTO): Promise<Paciente> {
    const dadosParaAtualizar = {
      ...dto,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('paciente')
      .update(dadosParaAtualizar)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar paciente no banco: ${error.message}`);
    }

    return data as Paciente;
  }

  /**
   * SOFT DELETE (Exclusão Lógica):
   * Conforme a regra RN05 (Inalterabilidade do Histórico Clínico), pacientes nunca
   * sofrem exclusão física (DELETE FROM paciente). Em vez disso, seu status_ativo é
   * alterado para false.
   * 
   * @param id - UUID do paciente a ser inativado
   */
  static async desativar(id: string): Promise<Paciente> {
    const { data, error } = await supabase
      .from('paciente')
      .update({
        status_ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao desativar paciente (soft delete): ${error.message}`);
    }

    return data as Paciente;
  }


  /**
   * DELETE  HARD (Exclusão Física):
   * Essa operação é de extrema cautela e só deve ser usada em casos excepcionais, como testes ou dados de exemplo.
   * 
   * @param id - UUID do paciente a ser inativado
   */

  static async deletarHard(id: string): Promise<Paciente> {
    const { data, error } = await supabase
      .from('paciente')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao deletar paciente (hard delete): ${error.message}`);
    }

    return data as Paciente;
  }

  /**
   * Reativa um paciente que havia sido previamente inativado por soft delete.
   * 
   * @param id - UUID do paciente a ser reativado
   */
  static async reativar(id: string): Promise<Paciente> {
    const { data, error } = await supabase
      .from('paciente')
      .update({
        status_ativo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao reativar paciente: ${error.message}`);
    }

    return data as Paciente;
  }
}