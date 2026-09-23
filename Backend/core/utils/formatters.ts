/**
 * ==============================================================================
 * FORMATTING UTILITIES (InTEA Core)
 * ==============================================================================
 * Normalization and formatting helpers for clinical and registry data:
 * - CPF: 000.000.000-00
 * - CEP: 00000-000
 * - Phone: +55 (XX) 9XXXX-XXXX
 */

/**
 * Extracts only numerical digits from an input string.
 *
 * @param valor - The raw string to extract digits from.
 * @returns String containing only numeric digits [0-9], or an empty string.
 */
export function apenasDigitos(valor: string | null | undefined): string {
  if (!valor || typeof valor !== 'string') return '';
  return valor.replace(/\D/g, '');
}

/**
 * Formats a Brazilian CPF string according to the standard pattern: 000.000.000-00.
 * If the input does not contain exactly 11 digits, the original string is returned.
 *
 * @param cpf - The raw or partially formatted CPF string.
 * @returns The formatted CPF string or the original value if invalid length.
 */
export function formatarCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const digitos = apenasDigitos(cpf);
  if (digitos.length !== 11) return cpf;
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formats a Brazilian Postal Code (CEP) string according to the standard pattern: 00000-000.
 * If the input does not contain exactly 8 digits, the original string is returned.
 *
 * @param cep - The raw or partially formatted CEP string.
 * @returns The formatted CEP string or the original value if invalid length.
 */
export function formatarCEP(cep: string | null | undefined): string {
  if (!cep) return '';
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) return cep;
  return digitos.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formats a Brazilian mobile phone number into the international E.164-like standard: +55 (XX) 9XXXX-XXXX.
 *
 * @param telefone - The raw phone string with or without country code and masks.
 * @returns The normalized and formatted phone number, or the original string if length is unhandled.
 */
export function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone || typeof telefone !== 'string') return '';

  let digitos = apenasDigitos(telefone);

  // Se enviado sem o DDI brasileiro (ex: 11987654321 - 11 dígitos)
  if (digitos.length === 11) {
    digitos = '55' + digitos;
  }

  // Com DDI 55 + DDD (2 dígitos) + 9 celular + 8 dígitos = 13 dígitos
  if (digitos.length === 13 && digitos.startsWith('55')) {
    const ddd = digitos.substring(2, 4);
    const nonoEDigitos = digitos.substring(4, 9); // 9XXXX
    const ultimos4 = digitos.substring(9, 13);     // XXXX
    return `+55 (${ddd}) ${nonoEDigitos}-${ultimos4}`;
  }

  // Se não bater com a regra de 11 ou 13 dígitos, retorna o valor original
  return telefone;
}
