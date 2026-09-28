// ==============================================================================
// InTEA: Serviço de Geração e Gerenciamento de Tokens de Sessão (Pareamento)
// ==============================================================================

export class SessaoTokenService {
  /**
   * Gera um código de pareamento único legível para o paciente inserir no game externo (Ex: '849-291')
   */
  static gerarCodigoPareamento(): string {
    const min = 100000;
    const max = 999999;
    const pin = Math.floor(Math.random() * (max - min + 1)) + min;
    const pinStr = pin.toString();
    return `${pinStr.slice(0, 3)}-${pinStr.slice(3)}`;
  }
}
