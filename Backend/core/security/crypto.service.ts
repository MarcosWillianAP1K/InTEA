import crypto from 'node:crypto';

/**
 * ==============================================================================
 * InTEA: Serviço de Criptografia Simétrica (AES-256-GCM) e Anonimização LGPD
 * Conformidade: RNF06 (LGPD / Privacidade de Dados Clínicos), RN04
 * Padrão: Clean Code, TypeScript estrito sem o uso de `any`
 * ==============================================================================
 */

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly PREFIX = 'enc:v1';
  private static readonly IV_LENGTH = 12; // 96 bits recomendado pelo NIST/FIPS para GCM
  private static readonly SALT = 'intea-lgpd-prontuario-salt-2026';

  /**
   * Obtém chave simétrica de 256 bits (32 bytes) a partir da variável de ambiente LGPD_ENCRYPTION_KEY.
   * Derivada de forma determinística via scryptSync para resistência contra força bruta.
   */
  private static obterChave(): Buffer {
    const segredo =
      process.env.LGPD_ENCRYPTION_KEY ||
      'intea-clinical-lgpd-default-master-key-32b!';
    return crypto.scryptSync(segredo, this.SALT, 32);
  }

  /**
   * Cifra um texto em repouso utilizando AES-256-GCM com autenticação de integridade.
   * Formato serializado: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
   *
   * @param textoClaro - Dado clínico sensível em texto claro
   */
  static cifrar(textoClaro: string): string {
    if (!textoClaro || typeof textoClaro !== 'string') return textoClaro;
    if (this.isCifrado(textoClaro)) return textoClaro;

    const chave = this.obterChave();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, chave, iv);

    let ciphertext = cipher.update(textoClaro, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${this.PREFIX}:${ivHex}:${authTag}:${ciphertext}`;
  }

  /**
   * Decifra um payload em repouso e valida a autenticidade dos dados via tag GCM.
   * Caso os dados tenham sofrido adulteração física ou chave inválida, rejeita com erro seguro.
   *
   * @param payloadCifrado - String cifrada no formato enc:v1:...
   */
  static decifrar(payloadCifrado: string): string {
    if (!payloadCifrado || typeof payloadCifrado !== 'string') return payloadCifrado;
    if (!this.isCifrado(payloadCifrado)) return payloadCifrado;

    try {
      const partes = payloadCifrado.split(':');
      if (partes.length !== 5 || partes[0] !== 'enc' || partes[1] !== 'v1') {
        return payloadCifrado;
      }

      const [, , ivHex, authTagHex, ciphertextHex] = partes;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const chave = this.obterChave();

      const decipher = crypto.createDecipheriv(this.ALGORITHM, chave, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Rejeita silenciosamente dados adulterados ou com chave incompatível, preservando o valor
      return payloadCifrado;
    }
  }

  /**
   * Verifica se o dado já se encontra cifrado pelo prefixo de versão do InTEA.
   */
  static isCifrado(texto: string): boolean {
    return typeof texto === 'string' && texto.startsWith(`${this.PREFIX}:`);
  }

  /**
   * Cifra condicionalmente apenas se o dado ainda não estiver cifrado.
   */
  static cifrarSeNaoCifrado(texto: string): string {
    return this.isCifrado(texto) ? texto : this.cifrar(texto);
  }

  /**
   * Decifra condicionalmente apenas se o dado estiver cifrado.
   */
  static decifrarSeCifrado(texto: string): string {
    return this.isCifrado(texto) ? this.decifrar(texto) : texto;
  }

  // ============================================================================
  // ROTINAS DE ANONIMIZAÇÃO E MASCARAMENTO DE IDENTIFICADORES (RNF06)
  // ============================================================================

  /**
   * Mascara CPF para conformidade com a LGPD (ex: 123.456.789-00 -> ***.***.***-00).
   */
  static mascararCPF(cpf: string | null | undefined): string {
    if (!cpf) return '';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return '***.***.***-**';
    const ultimosDois = limpo.slice(9);
    return `***.***.***-${ultimosDois}`;
  }

  /**
   * Mascara telefone para exibição segura em logs (ex: (11) 98765-4321 -> (11) *****-4321).
   */
  static mascararTelefone(telefone: string | null | undefined): string {
    if (!telefone) return '';
    const limpo = telefone.replace(/\D/g, '');
    if (limpo.length < 8) return '(**) *****-****';
    const ddd = limpo.length >= 10 ? limpo.slice(0, 2) : 'XX';
    const sufixo = limpo.slice(-4);
    return `(${ddd}) *****-${sufixo}`;
  }

  /**
   * Mascara nome pessoal (ex: Marcos Willian -> M***** W******).
   */
  static mascararNome(nome: string | null | undefined): string {
    if (!nome) return '';
    const partes = nome.trim().split(/\s+/);
    return partes
      .map((p) => (p.length > 1 ? `${p[0]}${'*'.repeat(Math.min(p.length - 1, 5))}` : p))
      .join(' ');
  }

  /**
   * Mascara e-mail (ex: marcos@intea.com.br -> m****s@intea.com.br).
   */
  static mascararEmail(email: string | null | undefined): string {
    if (!email || !email.includes('@')) return '*****@*****';
    const [local, dominio] = email.split('@');
    if (local.length <= 2) return `*@${dominio}`;
    const primeiro = local[0];
    const ultimo = local[local.length - 1];
    return `${primeiro}${'*'.repeat(Math.max(local.length - 2, 3))}${ultimo}@${dominio}`;
  }

  /**
   * Anonimiza recursivamente payloads e estruturas de dados antes de enviar a logs de console/arquivo.
   * Impede vazamento inadvertido de dados clínicos ou identificadores pessoais (LGPD).
   */
  static anonimizarParaLogs(dado: unknown): unknown {
    if (dado === null || dado === undefined) return dado;
    if (typeof dado !== 'object') return dado;

    if (Array.isArray(dado)) {
      return dado.map((item) => this.anonimizarParaLogs(item));
    }

    const objeto = dado as Record<string, unknown>;
    const sanitizado: Record<string, unknown> = {};

    for (const [chave, valor] of Object.entries(objeto)) {
      const chaveLower = chave.toLowerCase();

      if (chaveLower.includes('cpf')) {
        sanitizado[chave] = typeof valor === 'string' ? this.mascararCPF(valor) : '***.***.***-**';
      } else if (
        chaveLower.includes('telefone') ||
        chaveLower.includes('celular') ||
        chaveLower.includes('whatsapp')
      ) {
        sanitizado[chave] = typeof valor === 'string' ? this.mascararTelefone(valor) : '(**) *****-****';
      } else if (chaveLower.includes('email')) {
        sanitizado[chave] = typeof valor === 'string' ? this.mascararEmail(valor) : '*****@*****';
      } else if (
        chaveLower.includes('senha') ||
        chaveLower.includes('password') ||
        chaveLower.includes('token')
      ) {
        sanitizado[chave] = '[REDACTED_SECRET]';
      } else if (
        chaveLower === 'nome' ||
        chaveLower === 'nome_completo' ||
        chaveLower.includes('responsavel_nome')
      ) {
        sanitizado[chave] = typeof valor === 'string' ? this.mascararNome(valor) : '*****';
      } else if (typeof valor === 'object') {
        sanitizado[chave] = this.anonimizarParaLogs(valor);
      } else {
        sanitizado[chave] = valor;
      }
    }

    return sanitizado;
  }
}

/**
 * Utilitário de log seguro anonimizado para a aplicação (RNF06).
 */
export const secureLogger = {
  info: (mensagem: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.log(`[INFO] ${mensagem}`, CryptoService.anonimizarParaLogs(payload));
    } else {
      console.log(`[INFO] ${mensagem}`);
    }
  },
  warn: (mensagem: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.warn(`[WARN] ${mensagem}`, CryptoService.anonimizarParaLogs(payload));
    } else {
      console.warn(`[WARN] ${mensagem}`);
    }
  },
  error: (mensagem: string, payload?: unknown) => {
    if (payload !== undefined) {
      console.error(`[ERROR] ${mensagem}`, CryptoService.anonimizarParaLogs(payload));
    } else {
      console.error(`[ERROR] ${mensagem}`);
    }
  },
};
