/**
 * ==============================================================================
 * UTILITÁRIOS DE VALIDAÇÃO (InTEA Core)
 * ==============================================================================
 * Funções reutilizáveis para validação rigorosa de dados clínicos e cadastrais:
 * - Algoritmo oficial de validação de CPF (Módulo 11)
 * - Validação de formato de CEP brasileiro
 * - Validação de datas de nascimento reais (calendário, sem datas futuras)
 * - Validação combinada de DTOs de Paciente e Responsável
 */

/**
 * Valida se um CPF é matematicamente autêntico utilizando o algoritmo Módulo 11
 * da Receita Federal do Brasil.
 * 
 * @param cpf - Número do CPF com ou sem máscara (ex: "123.456.789-00" ou "12345678900")
 * @returns true se o CPF for válido, false caso contrário
 */
export function validarCPF(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false;

  // Remove caracteres não numéricos
  const limpo = cpf.replace(/\D/g, '');

  // CPF deve ter exatamente 11 dígitos
  if (limpo.length !== 11) return false;

  // Rejeita sequências repetidas conhecidas (ex: 000.000.000-00, 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // 1º Dígito Verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9), 10)) return false;

  // 2º Dígito Verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10), 10)) return false;

  return true;
}

/**
 * Valida o formato de CEP brasileiro (com ou sem hífen).
 * Exemplos válidos: "01310-100", "01310100"
 */
export function validarCEP(cep: string): boolean {
  if (!cep || typeof cep !== 'string') return false;
  const limpo = cep.replace(/\D/g, '');
  return limpo.length === 8;
}

/**
 * Valida se uma string é um UUID válido (formato canonical 8-4-4-4-12).
 * Evita erros de sintaxe 22P02 no PostgreSQL.
 * 
 * @param id - Identificador a ser validado
 */
export function validarUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexUUID.test(id.trim());
}

/**
 * Valida se um número de telefone é um celular brasileiro válido.
 * Deve possuir DDD válido (11 a 99) e o dígito 9 na frente do número de celular.
 * Aceita números com ou sem DDI (+55), com ou sem formatação.
 * 
 * Exemplos válidos:
 * - "+55 (11) 98765-4321"
 * - "11987654321"
 * - "+5511987654321"
 * - "(84) 99876-1234"
 */
export function validarTelefone(telefone: string): boolean {
  if (!telefone || typeof telefone !== 'string') return false;

  const digitos = telefone.replace(/\D/g, '');

  // Com DDI 55: 13 dígitos (55 + DDD + 9 + 8 dígitos)
  if (digitos.length === 13) {
    return /^55[1-9]{2}9\d{8}$/.test(digitos);
  }

  // Sem DDI 55: 11 dígitos (DDD + 9 + 8 dígitos)
  if (digitos.length === 11) {
    return /^[1-9]{2}9\d{8}$/.test(digitos);
  }

  return false;
}

/**
 * Valida uma data de nascimento no formato ISO (YYYY-MM-DD).
 * Garante que a data exista no calendário e não seja no futuro.
 */
export function validarDataNascimento(dataStr: string): { valida: boolean; erro?: string } {
  if (!dataStr || typeof dataStr !== 'string') {
    return { valida: false, erro: 'Data de nascimento é obrigatória.' };
  }

  // Formato YYYY-MM-DD
  const regexData = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexData.test(dataStr)) {
    return { valida: false, erro: 'Data de nascimento deve estar no formato AAAA-MM-DD (ISO 8601).' };
  }

  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);

  // Valida existência no calendário (evita 2023-02-31 virar março)
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return { valida: false, erro: 'Data de nascimento inexistente no calendário.' };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (data > hoje) {
    return { valida: false, erro: 'A data de nascimento não pode ser no futuro.' };
  }

  const idade = hoje.getFullYear() - ano;
  if (idade > 120) {
    return { valida: false, erro: 'Data de nascimento fora do limite aceitável (> 120 anos).' };
  }

  return { valida: true };
}

/**
 * Validador completo para o DTO de criação de paciente (POST /api/paciente).
 */
export function validarCriarPacienteDTO(payload: any): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  // Nome obrigatório
  if (!payload?.nome || typeof payload.nome !== 'string' || payload.nome.trim().length < 2) {
    erros.push('O campo "nome" é obrigatório e deve conter ao menos 2 caracteres.');
  }

  // Data de nascimento
  const checagemData = validarDataNascimento(payload?.data_nascimento);
  if (!checagemData.valida) {
    erros.push(checagemData.erro!);
  }

  // CPF obrigatório e matematicamente válido
  if (!payload?.cpf || typeof payload.cpf !== 'string') {
    erros.push('O campo "cpf" é obrigatório.');
  } else if (!validarCPF(payload.cpf)) {
    erros.push('O CPF informado é inválido.');
  }

  // CEP opcional
  if (payload?.cep && !validarCEP(payload.cep)) {
    erros.push('O CEP informado é inválido. Utilize o formato 00000-000 ou 8 dígitos numéricos.');
  }

  // Telefone opcional
  if (payload?.telefone && typeof payload.telefone === 'string') {
    if (!validarTelefone(payload.telefone)) {
      erros.push('O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).');
    }
  }

  // Responsável opcional
  if (payload?.responsavel) {
    const resp = payload.responsavel;
    if (!resp.nome || typeof resp.nome !== 'string' || resp.nome.trim().length < 2) {
      erros.push('O responsável deve conter um "nome" válido.');
    }
    if (resp.cpf && !validarCPF(resp.cpf)) {
      erros.push('O CPF do responsável é inválido.');
    }
    if (resp.telefone && typeof resp.telefone === 'string') {
      if (!validarTelefone(resp.telefone)) {
        erros.push('O telefone do responsável é inválido. Deve conter DDD e o dígito 9 na frente.');
      }
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Validador para o DTO de atualização de paciente (PUT /api/paciente/:id).
 */
export function validarAtualizarPacienteDTO(payload: any): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (payload?.nome !== undefined) {
    if (typeof payload.nome !== 'string' || payload.nome.trim().length < 2) {
      erros.push('O campo "nome" deve conter ao menos 2 caracteres.');
    }
  }

  if (payload?.data_nascimento !== undefined) {
    const checagemData = validarDataNascimento(payload.data_nascimento);
    if (!checagemData.valida) {
      erros.push(checagemData.erro!);
    }
  }

  if (payload?.cpf !== undefined && payload.cpf !== null) {
    if (!validarCPF(payload.cpf)) {
      erros.push('O CPF informado é inválido.');
    }
  }

  if (payload?.cep !== undefined && payload.cep !== null) {
    if (!validarCEP(payload.cep)) {
      erros.push('O CEP informado é inválido. Utilize o formato 00000-000 ou 8 dígitos numéricos.');
    }
  }

  if (payload?.telefone !== undefined && payload.telefone !== null) {
    if (!validarTelefone(payload.telefone)) {
      erros.push('O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente.');
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}
