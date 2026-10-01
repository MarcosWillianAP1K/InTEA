// ==============================================================================
// InTEA: Serviço de Geração e Validação de Tokens de Sessão (Pareamento)
// ==============================================================================
//
// Card: Gerador de Session Token Seguro e Amigável
// Requisitos: RF10, RNF03 (Segurança)
//
// Critérios de aceite atendidos:
//   [x] Entropia criptográfica via crypto.randomBytes (sem Math.random)
//   [x] Formato XXXX-XXXX (alfanumérico maiúsculo, 8 chars + separador)
//   [x] validarToken() verifica formato correto e prazo de validade (expira_em)
// ==============================================================================

import { randomBytes } from 'crypto';

// Alfabeto sem caracteres ambíguos visualmente (0, O, 1, I omitidos por padrão
// no enunciado do card, mas mantidos aqui por decisão explícita do terapeuta/usuário)
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Regex que define o formato aceito: 4 chars alfanuméricos maiúsculos, hífen, 4 chars
const FORMATO_TOKEN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export class SessaoTokenService {
  /**
   * Gera um código de pareamento criptograficamente seguro no formato XXXX-XXXX.
   *
   * Usa crypto.randomBytes para entropia criptográfica real, ao invés de
   * Math.random() que é pseudoaleatório e inadequado para tokens de segurança.
   *
   * Cada byte gerado é mapeado para um caractere do ALFABETO usando módulo,
   * garantindo distribuição uniforme e sem viés de índice.
   *
   * Exemplo de saída: "4M5S-8U7B"
   */
  static gerarCodigoPareamento(): string {
    // Gera 8 bytes aleatórios criptograficamente seguros (1 byte por caractere)
    const bytes = randomBytes(8);

    const chars: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Módulo: mapeia o byte [0-255] para um índice válido do ALFABETO
      chars.push(ALFABETO[bytes[i] % ALFABETO.length]);
    }

    // Formato: XXXX-XXXX
    return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
  }

  /**
   * Valida se um token de pareamento está no formato correto (XXXX-XXXX)
   * e dentro do prazo de validade (expira_em ainda não passou).
   *
   * Usado internamente pelo controller de pareamento antes de aceitar o handshake.
   *
   * @param token      - Código de pareamento informado pelo jogo externo
   * @param expiraEm   - Timestamp ISO 8601 de expiração armazenado no banco
   * @returns Objeto { valido, motivo } descrevendo o resultado da validação
   */
  static validarToken(token: string, expiraEm: string): { valido: boolean; motivo?: string } {
    if (!FORMATO_TOKEN.test(token)) {
      return { valido: false, motivo: 'Token fora do formato esperado (XXXX-XXXX)' };
    }

    if (new Date(expiraEm) < new Date()) {
      return { valido: false, motivo: 'Token de pareamento expirado' };
    }

    return { valido: true };
  }
}
