/**
 * ==============================================================================
 * UTILITÁRIOS DE FORMATAÇÃO (InTEA Core)
 * ==============================================================================
 * Funções para normalização e formatação de dados cadastrais:
 * - CPF: 000.000.000-00
 * - CEP: 00000-000
 * - Telefone: +55 (XX) 9XXXX-XXXX
 */

/**
 * Extrai apenas os dígitos numéricos de uma string.
 * 
 * @param valor - String a ser limpa
 * @returns Apenas os caracteres numéricos [0-9]
 */
export function apenasDigitos(valor: string | null | undefined): string {
  if (!valor || typeof valor !== 'string') return '';
  return valor.replace(/\D/g, '');
}

/**
 * Formata um CPF no padrão oficial brasileiro: 000.000.000-00.
 * Caso a string não possua exatamente 11 dígitos, retorna o valor original.
 * 
 * @param cpf - CPF com ou sem máscara
 */
export function formatarCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const digitos = apenasDigitos(cpf);
  if (digitos.length !== 11) return cpf;
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata um CEP no padrão brasileiro: 00000-000.
 * Caso a string não possua exatamente 8 dígitos, retorna o valor original.
 * 
 * @param cep - CEP com ou sem hífen
 */
export function formatarCEP(cep: string | null | undefined): string {
  if (!cep) return '';
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) return cep;
  return digitos.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata um telefone celular brasileiro no padrão oficial internacional:
 * +55 (XX) 9XXXX-XXXX
 * 
 * Aceita números com ou sem DDI (55) e com ou sem máscara.
 * - Se enviado com 11 dígitos (DDD + 9 dígitos), adiciona o DDI +55.
 * - Se enviado com 13 dígitos começando com 55, formata com DDI.
 * - Garante que o nono dígito (9) esteja posicionado corretamente.
 * 
 * @param telefone - Telefone informado
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
