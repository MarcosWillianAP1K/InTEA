// ==============================================================================
// InTEA: Serviço de Geração e Gerenciamento de Tokens de Sessão (Pareamento)
// ==============================================================================

export class SessaoTokenService {
  /**
   * Gera um código de pareamento único legível para o paciente inserir no game externo (Ex: '849-291')
   */
  static gerarCodigoPareamento(): string {
    let codigo = '';
    const numDigitos = 4; // Número de dígitos em cada parte do código

    function gerarParteCodigo(): string {
      let parte = '';
      for (let i = 0; i < numDigitos; i++) {
        let codigoParcial = '';
        if (i % 2 === 0) {
          codigoParcial = Math.floor(Math.random() * 9).toString();
          parte += codigoParcial;
        }
        else {
          const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const indiceLetra = Math.floor(Math.random() * letras.length);
          codigoParcial = letras[indiceLetra];
          parte += codigoParcial;
        }
      }

      return parte;
    }

    codigo = `${gerarParteCodigo()}-${gerarParteCodigo()}`;

    return codigo;
  }
}
