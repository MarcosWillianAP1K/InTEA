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
  responsaveis?: any[];            // Responsáveis vinculados
  terapeutas?: any[];              // Terapeutas vinculados
}

/**
 * DTO para cadastro de responsável associado ao paciente.
 */
export interface CriarResponsavelDTO {
  nome: string;
  telefone: string;
  cpf?: string | null;
  email?: string | null;
  parentesco?: string | null;      // Ex: "Mãe", "Pai", "Tutor Legal", "Avó"
}

/**
 * DTO para criação de paciente (POST /api/paciente).
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
  responsavel?: CriarResponsavelDTO | null; // Responsável opcional
}

/**
 * DTO para atualização de paciente (PUT /api/paciente/:id).
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

/**
 * Parâmetros de busca, filtros e paginação de pacientes.
 */
export interface FiltrosPacienteDTO {
  nome?: string;
  cpf?: string;
  idadeMin?: number;
  idadeMax?: number;
  incluirInativos?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Metadados de paginação.
 */
export interface MetaPaginacao {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RespostaListagemPaciente {
  data: Paciente[];
  meta?: MetaPaginacao;
}

// ==============================================================================
// 2. MODEL: PacienteModel
// ==============================================================================

export class PacienteModel {

  /**
   * Lista pacientes com suporte a busca textual, faixa etária e paginação.
   * 
   * @param filtros - Critérios de filtro e paginação
   */
  static async listar(filtros: FiltrosPacienteDTO = {}): Promise<RespostaListagemPaciente> {
    let query = supabase
      .from('paciente')
      .select('*, responsaveis:paciente_responsavel(responsavel(*))', { count: 'exact' })
      .order('nome', { ascending: true });

    // 1. Filtro por status ativo (Soft Delete)
    if (!filtros.incluirInativos) {
      query = query.eq('status_ativo', true);
    }

    // 2. Busca parcial por nome (insensível a maiúsculas/minúsculas)
    if (filtros.nome && filtros.nome.trim() !== '') {
      query = query.ilike('nome', `%${filtros.nome.trim()}%`);
    }

    // 3. Busca por CPF (busca com e sem máscara)
    if (filtros.cpf && filtros.cpf.trim() !== '') {
      const digitosCpf = filtros.cpf.replace(/\D/g, '');
      if (digitosCpf.length === 11) {
        const cpfFormatado = `${digitosCpf.slice(0, 3)}.${digitosCpf.slice(3, 6)}.${digitosCpf.slice(6, 9)}-${digitosCpf.slice(9, 11)}`;
        query = query.or(`cpf.eq."${cpfFormatado}",cpf.eq."${digitosCpf}"`);
      } else if (digitosCpf.length > 0) {
        query = query.ilike('cpf', `%${filtros.cpf.trim()}%`);
      }
    }

    // 4. Filtro por Faixa Etária (Calculado sobre data_nascimento sem drift de fuso horário)
    const formatarDataLocalISO = (d: Date): string => {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    const hoje = new Date();
    if (filtros.idadeMin !== undefined && filtros.idadeMin >= 0) {
      // Data de nascimento máxima = hoje - idadeMin anos
      const maxNascimento = new Date(hoje.getFullYear() - filtros.idadeMin, hoje.getMonth(), hoje.getDate());
      query = query.lte('data_nascimento', formatarDataLocalISO(maxNascimento));
    }

    if (filtros.idadeMax !== undefined && filtros.idadeMax >= 0) {
      // Data de nascimento mínima = hoje - (idadeMax + 1) anos + 1 dia
      const minNascimento = new Date(hoje.getFullYear() - filtros.idadeMax - 1, hoje.getMonth(), hoje.getDate() + 1);
      query = query.gte('data_nascimento', formatarDataLocalISO(minNascimento));
    }

    // 5. Paginação segura (protegida contra DoS de memória)
    const page = filtros.page && filtros.page > 0 ? Math.floor(Number(filtros.page)) : 1;
    const rawLimit = filtros.limit && filtros.limit > 0 ? Math.floor(Number(filtros.limit)) : 10;
    const limit = Math.min(rawLimit, 100); // Teto máximo de 100 registros por página
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao listar pacientes no banco: ${error.message}`);
    }

    const total = count ?? (data?.length || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data as Paciente[]) || [],
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Busca um paciente específico pelo identificador UUID.
   */
  static async buscarPorId(id: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from('paciente')
      .select('*, responsaveis:paciente_responsavel(responsavel(*)), terapeutas:terapeuta_paciente(terapeuta(*))')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar paciente por ID: ${error.message}`);
    }

    return (data as Paciente) || null;
  }

  /**
   * Cadastra um novo paciente e opcionalmente seu responsável.
   */
  static async criar(dto: CriarPacienteDTO): Promise<Paciente> {
    const payloadPaciente = {
      nome: dto.nome.trim(),
      data_nascimento: dto.data_nascimento,
      cpf: dto.cpf,
      clinica_id: dto.clinica_id || null,
      telefone: dto.telefone || null,
      cep: dto.cep || null,
      cidade: dto.cidade || null,
      estado: dto.estado || null,
      endereco: dto.endereco || null,
      bairro: dto.bairro || null,
      numero: dto.numero || null,
      complemento: dto.complemento || null,
      status_ativo: true,
    };

    const { data: pacienteData, error: pacienteError } = await supabase
      .from('paciente')
      .insert([payloadPaciente])
      .select()
      .single();

    if (pacienteError) {
      throw new Error(`Erro ao inserir paciente no banco: ${pacienteError.message}`);
    }

    const novoPaciente = pacienteData as Paciente;

    // Se houver responsável no payload, cadastra e vincula na tabela associativa
    if (dto.responsavel) {
      try {
        const { data: respData, error: respError } = await supabase
          .from('responsavel')
          .insert([{
            nome: dto.responsavel.nome.trim(),
            telefone: dto.responsavel.telefone,
            cpf: dto.responsavel.cpf || null,
            email: dto.responsavel.email || null,
            parentesco: dto.responsavel.parentesco || 'Responsável',
          }])
          .select()
          .single();

        if (!respError && respData) {
          await supabase.from('paciente_responsavel').insert([{
            paciente_id: novoPaciente.id,
            responsavel_id: respData.id,
            tipo_responsavel: 'principal',
          }]);
        }
      } catch (err) {
        console.warn('[PacienteModel.criar] Aviso ao salvar responsável vinculado:', err);
      }
    }

    const pacienteCompleto = await this.buscarPorId(novoPaciente.id);
    return pacienteCompleto || novoPaciente;
  }

  /**
   * Atualiza dados cadastrais de um paciente.
   */
  static async atualizar(id: string, dto: AtualizarPacienteDTO): Promise<Paciente> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.nome !== undefined) payload.nome = dto.nome.trim();
    if (dto.data_nascimento !== undefined) payload.data_nascimento = dto.data_nascimento;
    if (dto.clinica_id !== undefined) payload.clinica_id = dto.clinica_id;
    if (dto.telefone !== undefined) payload.telefone = dto.telefone;
    if (dto.cpf !== undefined) payload.cpf = dto.cpf;
    if (dto.cep !== undefined) payload.cep = dto.cep;
    if (dto.cidade !== undefined) payload.cidade = dto.cidade;
    if (dto.estado !== undefined) payload.estado = dto.estado;
    if (dto.endereco !== undefined) payload.endereco = dto.endereco;
    if (dto.bairro !== undefined) payload.bairro = dto.bairro;
    if (dto.numero !== undefined) payload.numero = dto.numero;
    if (dto.complemento !== undefined) payload.complemento = dto.complemento;
    if (dto.status_ativo !== undefined) payload.status_ativo = dto.status_ativo;

    const { data, error } = await supabase
      .from('paciente')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar paciente no banco: ${error.message}`);
    }

    return data as Paciente;
  }

  /**
   * SOFT DELETE: Inativa o paciente.
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
      throw new Error(`Erro ao desativar paciente: ${error.message}`);
    }

    return data as Paciente;
  }

  /**
   * Reativa um paciente inativo.
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

  /**
   * HARD DELETE: Exclusão física permanente (DEV e Testes).
   */
  static async deletarHard(id: string): Promise<void> {
    const { error } = await supabase
      .from('paciente')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir paciente fisicamente: ${error.message}`);
    }
  }

  // ============================================================================
  // 3. GESTÃO DE VÍNCULOS TERAPEUTA-PACIENTE
  // ============================================================================

  /**
   * Vincula um terapeuta a um paciente.
   * Valida se ambos pertencem à mesma clínica caso clinica_id esteja definido.
   * 
   * @param pacienteId - UUID do paciente
   * @param terapeutaId - UUID do terapeuta
   */
  static async vincularTerapeuta(pacienteId: string, terapeutaId: string): Promise<void> {
    // 1. Busca paciente
    const { data: paciente, error: pacError } = await supabase
      .from('paciente')
      .select('id, clinica_id, status_ativo')
      .eq('id', pacienteId)
      .maybeSingle();

    if (pacError || !paciente) {
      throw new Error('Paciente não encontrado para vincular terapeuta.');
    }

    if (!paciente.status_ativo) {
      throw new Error('Não é possível vincular terapeuta a um paciente inativo.');
    }

    // 2. Busca terapeuta
    const { data: terapeuta, error: terError } = await supabase
      .from('terapeuta')
      .select('id, clinica_id, status_ativo')
      .eq('id', terapeutaId)
      .maybeSingle();

    if (terError || !terapeuta) {
      throw new Error('Terapeuta não encontrado para vinculação.');
    }

    if (!terapeuta.status_ativo) {
      throw new Error('Não é possível vincular um terapeuta inativo.');
    }

    // 3. Bloqueio de vínculo entre clínicas distintas
    if (paciente.clinica_id && terapeuta.clinica_id && paciente.clinica_id !== terapeuta.clinica_id) {
      throw new Error('Bloqueio de segurança: Não é permitido vincular terapeutas de clínicas diferentes.');
    }

    // 4. Cria vínculo (se já existir, ignora erro de duplicidade)
    const { error: linkError } = await supabase
      .from('terapeuta_paciente')
      .insert([{
        paciente_id: pacienteId,
        terapeuta_id: terapeutaId,
      }]);

    if (linkError && !linkError.message.includes('duplicate key') && !linkError.message.includes('unique constraint')) {
      throw new Error(`Erro ao registrar vínculo: ${linkError.message}`);
    }
  }

  /**
   * Remove o vínculo de um terapeuta com o paciente.
   * 
   * @param pacienteId - UUID do paciente
   * @param terapeutaId - UUID do terapeuta
   */
  static async desvincularTerapeuta(pacienteId: string, terapeutaId: string): Promise<void> {
    const { data: paciente, error: pacError } = await supabase
      .from('paciente')
      .select('id')
      .eq('id', pacienteId)
      .maybeSingle();

    if (pacError || !paciente) {
      throw new Error('Paciente não encontrado para desvincular terapeuta.');
    }

    const { error } = await supabase
      .from('terapeuta_paciente')
      .delete()
      .eq('paciente_id', pacienteId)
      .eq('terapeuta_id', terapeutaId);

    if (error) {
      throw new Error(`Erro ao remover vínculo: ${error.message}`);
    }
  }

  /**
   * Lista todos os terapeutas associados a um paciente.
   * 
   * @param pacienteId - UUID do paciente
   */
  static async listarTerapeutasVinculados(pacienteId: string): Promise<any[]> {
    const { data: paciente, error: pacError } = await supabase
      .from('paciente')
      .select('id')
      .eq('id', pacienteId)
      .maybeSingle();

    if (pacError || !paciente) {
      throw new Error('Paciente não encontrado ao listar terapeutas vinculados.');
    }

    const { data, error } = await supabase
      .from('terapeuta_paciente')
      .select('created_at, terapeuta:terapeuta(*)')
      .eq('paciente_id', pacienteId);

    if (error) {
      throw new Error(`Erro ao listar terapeutas vinculados: ${error.message}`);
    }

    return data || [];
  }
}