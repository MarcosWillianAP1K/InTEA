/**
 * ==============================================================================
 * VALIDATION UTILITIES (InTEA Core)
 * ==============================================================================
 * Reusable functions for validation of clinical and registration data:
 * - Official Brazilian CPF verification algorithm (Modulo 11)
 * - Brazilian Postal Code (CEP) format verification
 * - Realistic birth date calendar verification
 * - Comprehensive schema validation for Patient DTOs
 */

/**
 * Validates whether a Brazilian CPF number is mathematically authentic using Modulo 11 algorithm.
 *
 * @param cpf - CPF string with or without formatting punctuation.
 * @returns True if the CPF passes checksum verification, false otherwise.
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
 * Validates the format of a Brazilian Postal Code (CEP), with or without hyphen.
 *
 * @param cep - The raw or masked postal code string (e.g., "01310-100" or "01310100").
 * @returns True if the sanitized string contains exactly 8 digits, false otherwise.
 */
export function validarCEP(cep: string): boolean {
  if (!cep || typeof cep !== 'string') return false;
  const limpo = cep.replace(/\D/g, '');
  return limpo.length === 8;
}

/**
 * Validates if a string matches the standard canonical UUID format (8-4-4-4-12 hex digits).
 *
 * @param id - The identifier candidate to inspect.
 * @returns True if the string conforms to UUID v1-v5 format, false otherwise.
 */
export function validarUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexUUID.test(id.trim());
}

/**
 * Validates whether a phone number represents a valid Brazilian mobile phone.
 * Checks for a 2-digit area code (DDD 11-99) followed by the mandatory 9 digit.
 *
 * @param telefone - The phone number string with or without country code and formatting.
 * @returns True if the phone matches Brazilian mobile criteria, false otherwise.
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
 * Validates a birth date against the ISO 8601 format (YYYY-MM-DD), ensuring calendar reality and age bounds.
 *
 * @param dataStr - The date string candidate in YYYY-MM-DD format.
 * @returns Object indicating validity and an optional error message in English or localized string.
 */
export function validarDataNascimento(dataStr?: unknown): { valida: boolean; erro?: string } {
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

export interface CriarPacientePayloadRaw {
  nome?: unknown;
  data_nascimento?: unknown;
  cpf?: unknown;
  cep?: unknown;
  telefone?: unknown;
  responsavel?: {
    nome?: unknown;
    cpf?: unknown;
    telefone?: unknown;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface AtualizarPacientePayloadRaw {
  nome?: unknown;
  data_nascimento?: unknown;
  cpf?: unknown;
  cep?: unknown;
  telefone?: unknown;
  [key: string]: unknown;
}

/**
 * Validates a guardian block (`responsavel` or `responsavel_extra`) inside a patient payload.
 * Appends localized validation errors to the provided `erros` array when fields are invalid.
 *
 * @param respRaw - Raw guardian object from the request payload.
 * @param label - Human-readable label identifying the guardian role in error messages.
 * @param erros - Mutable list collecting validation error messages.
 * @param exigirNomeQuandoObjeto - Whether `nome` is required even when no other guardian fields are populated.
 */
function validarBlocoResponsavel(
  respRaw: unknown,
  label: string,
  erros: string[],
  exigirNomeQuandoObjeto: boolean
): void {
  if (!respRaw || typeof respRaw !== 'object') return;
  const resp = respRaw as Record<string, unknown>;

  const possuiAlgumDado =
    Boolean(typeof resp.nome === 'string' && resp.nome.trim()) ||
    Boolean(typeof resp.cpf === 'string' && resp.cpf.trim()) ||
    Boolean(typeof resp.telefone === 'string' && resp.telefone.trim()) ||
    Boolean(typeof resp.email === 'string' && resp.email.trim()) ||
    Boolean(typeof resp.cep === 'string' && resp.cep.trim()) ||
    Boolean(typeof resp.endereco === 'string' && resp.endereco.trim());

  if (!exigirNomeQuandoObjeto && !possuiAlgumDado) {
    return;
  }

  if (!resp.nome || typeof resp.nome !== 'string' || resp.nome.trim().length < 2) {
    erros.push(`${label} deve conter um "nome" válido.`);
  }
  if (resp.cpf && typeof resp.cpf === 'string' && !validarCPF(resp.cpf)) {
    erros.push(`O CPF ${label === 'O responsável' ? 'do responsável' : 'do responsável extra'} é inválido.`);
  }
  if (resp.telefone && typeof resp.telefone === 'string' && !validarTelefone(resp.telefone)) {
    erros.push(
      `O telefone ${label === 'O responsável' ? 'do responsável' : 'do responsável extra'} é inválido. Deve conter DDD e o dígito 9 na frente.`
    );
  }
  if (resp.cep && typeof resp.cep === 'string' && !validarCEP(resp.cep)) {
    erros.push(
      `O CEP ${label === 'O responsável' ? 'do responsável' : 'do responsável extra'} é inválido. Utilize o formato 00000-000 ou 8 dígitos numéricos.`
    );
  }
  if (resp.data_nascimento && typeof resp.data_nascimento === 'string') {
    const checagemData = validarDataNascimento(resp.data_nascimento);
    if (!checagemData.valida) {
      erros.push(checagemData.erro!);
    }
  }
}

/**
 * Validates the clinical data block (`dados_clinicos`) of a patient payload.
 * Ensures diagnosis, general notes, and sensory triggers have valid types.
 *
 * @param dcRaw - Raw clinical data object from the request payload.
 * @param erros - Mutable list collecting validation error messages.
 */
function validarBlocoDadosClinicos(dcRaw: unknown, erros: string[]): void {
  if (!dcRaw || typeof dcRaw !== 'object') return;
  const dc = dcRaw as Record<string, unknown>;

  if (
    dc.diagnostico_base !== undefined &&
    dc.diagnostico_base !== null &&
    typeof dc.diagnostico_base !== 'string'
  ) {
    erros.push('O campo "diagnostico_base" dos dados clínicos deve ser uma string.');
  }

  if (
    dc.observacoes_gerais !== undefined &&
    dc.observacoes_gerais !== null &&
    typeof dc.observacoes_gerais !== 'string'
  ) {
    erros.push('O campo "observacoes_gerais" dos dados clínicos deve ser uma string.');
  }

  if (dc.gatilhos_sensoriais !== undefined && dc.gatilhos_sensoriais !== null) {
    if (Array.isArray(dc.gatilhos_sensoriais)) {
      if (!dc.gatilhos_sensoriais.every((item) => typeof item === 'string')) {
        erros.push('Todos os itens de "gatilhos_sensoriais" devem ser strings.');
      }
    } else if (typeof dc.gatilhos_sensoriais !== 'string') {
      erros.push('O campo "gatilhos_sensoriais" deve ser uma lista de strings ou texto separado por vírgulas.');
    }
  }
}

/**
 * Validates the complete payload DTO for creating a new patient record (POST /api/paciente).
 *
 * @param payload - The request body object containing patient and optional guardian details.
 * @returns Object containing boolean status `valido` and array of validation errors `erros`.
 */
export function validarCriarPacienteDTO(payload: unknown): { valido: boolean; erros: string[] } {
  const p = (payload && typeof payload === 'object') ? (payload as Record<string, unknown>) : null;
  const erros: string[] = [];

  // Nome obrigatório
  if (!p?.nome || typeof p.nome !== 'string' || p.nome.trim().length < 2) {
    erros.push('O campo "nome" é obrigatório e deve conter ao menos 2 caracteres.');
  }

  // Data de nascimento
  const checagemData = validarDataNascimento(p?.data_nascimento);
  if (!checagemData.valida) {
    erros.push(checagemData.erro!);
  }

  // CPF obrigatório e matematicamente válido
  if (!p?.cpf || typeof p.cpf !== 'string') {
    erros.push('O campo "cpf" é obrigatório.');
  } else if (!validarCPF(p.cpf)) {
    erros.push('O CPF informado é inválido.');
  }

  // CEP opcional
  if (p?.cep && typeof p.cep === 'string' && !validarCEP(p.cep)) {
    erros.push('O CEP informado é inválido. Utilize o formato 00000-000 ou 8 dígitos numéricos.');
  }

  // Telefone opcional
  if (p?.telefone && typeof p.telefone === 'string') {
    if (!validarTelefone(p.telefone)) {
      erros.push('O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).');
    }
  }

  validarBlocoResponsavel(p?.responsavel, 'O responsável', erros, true);
  validarBlocoResponsavel(p?.responsavel_extra, 'O responsável extra', erros, false);
  validarBlocoDadosClinicos(p?.dados_clinicos, erros);

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Validates partial update payload DTO for an existing patient record (PUT /api/paciente/:id).
 *
 * @param payload - The request body object containing fields to update.
 * @returns Object containing boolean status `valido` and array of validation errors `erros`.
 */
export function validarAtualizarPacienteDTO(payload: unknown): { valido: boolean; erros: string[] } {
  const p = (payload && typeof payload === 'object') ? (payload as Record<string, unknown>) : null;
  const erros: string[] = [];

  if (p?.nome !== undefined) {
    if (typeof p.nome !== 'string' || p.nome.trim().length < 2) {
      erros.push('O campo "nome" deve conter ao menos 2 caracteres.');
    }
  }

  if (p?.data_nascimento !== undefined && p.data_nascimento !== null) {
    if (typeof p.data_nascimento !== 'string') {
      erros.push('Data de nascimento deve estar no formato AAAA-MM-DD (ISO 8601).');
    } else {
      const checagemData = validarDataNascimento(p.data_nascimento);
      if (!checagemData.valida) {
        erros.push(checagemData.erro!);
      }
    }
  }

  if (p?.cpf !== undefined && p.cpf !== null) {
    if (typeof p.cpf !== 'string' || !validarCPF(p.cpf)) {
      erros.push('O CPF informado é inválido.');
    }
  }

  if (p?.cep !== undefined && p.cep !== null) {
    if (typeof p.cep !== 'string' || !validarCEP(p.cep)) {
      erros.push('O CEP informado é inválido. Utilize o formato 00000-000 ou 8 dígitos numéricos.');
    }
  }

  if (p?.telefone !== undefined && p.telefone !== null && p.telefone !== '') {
    if (typeof p.telefone !== 'string' || !validarTelefone(p.telefone)) {
      erros.push('O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente.');
    }
  }

  validarBlocoResponsavel(p?.responsavel, 'O responsável', erros, false);
  validarBlocoResponsavel(p?.responsavel_extra, 'O responsável extra', erros, false);
  validarBlocoDadosClinicos(p?.dados_clinicos, erros);

  return {
    valido: erros.length === 0,
    erros,
  };
}
