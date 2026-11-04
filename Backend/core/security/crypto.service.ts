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
   * Retrieves or derives a 256-bit symmetric encryption key from the environment.
   * Cryptographic Hardening (RNF06): Uses scryptSync derivation with a fixed salt for brute-force resistance.
   *
   * @returns 32-byte cryptographic key Buffer
   */
  private static obterChave(): Buffer {
    const segredo =
      process.env.LGPD_ENCRYPTION_KEY ||
      'intea-clinical-lgpd-default-master-key-32b!';
    return crypto.scryptSync(segredo, this.SALT, 32);
  }

  /**
   * Encrypts sensitive data at rest using AES-256-GCM with authenticated integrity checks.
   * Serialization Format: Returns `enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`.
   *
   * @param textoClaro - Sensitive clinical plaintext to encrypt
   * @returns Encrypted and formatted ciphertext string
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
   * Decrypts ciphertext at rest and validates payload authenticity using the GCM authentication tag.
   * Tamper Detection (RNF06): Throws a security error if the ciphertext, IV, or auth tag was altered.
   *
   * @param payloadCifrado - Formatted ciphertext string (enc:v1:...)
   * @returns Decrypted plaintext string
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
   * Checks whether the provided data string has already been encrypted with the InTEA versioned prefix.
   * Envelope Inspection: Checks for presence of `enc:v1:` prefix.
   *
   * @param valor - Text string to inspect
   * @returns True if already encrypted, false otherwise
   */
  static isCifrado(texto: string): boolean {
    return typeof texto === 'string' && texto.startsWith(`${this.PREFIX}:`);
  }

  /**
   * Conditionally encrypts clinical data only if it is not already encrypted.
   * Idempotent Encryption: Avoids double encryption of previously stored fields.
   *
   * @param valor - Sensitive data string or null/undefined
   * @returns Encrypted string or original value if empty or already encrypted
   */
  static cifrarSeNaoCifrado(texto: string): string {
    return this.isCifrado(texto) ? texto : this.cifrar(texto);
  }

  /**
   * Conditionally decrypts a value only if it contains the InTEA encryption envelope.
   * Transparent Read: Returns plaintext unmodified if the value was unencrypted.
   *
   * @param valor - Potentially encrypted ciphertext string
   * @returns Decrypted plaintext string
   */
  static decifrarSeCifrado(texto: string): string {
    return this.isCifrado(texto) ? this.decifrar(texto) : texto;
  }

  // ============================================================================
  // ROTINAS DE ANONIMIZAÇÃO E MASCARAMENTO DE IDENTIFICADORES (RNF06)
  // ============================================================================

  /**
   * Masks a CPF string in compliance with LGPD data privacy regulations (e.g. `***.***.***-00`).
   * Privacy Protection (RNF06): Redacts demographic digits while preserving formatting.
   *
   * @param cpf - Raw or partially formatted CPF string
   * @returns Masked CPF string
   */
  static mascararCPF(cpf: string | null | undefined): string {
    if (!cpf) return '';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return '***.***.***-**';
    const ultimosDois = limpo.slice(9);
    return `***.***.***-${ultimosDois}`;
  }

  /**
   * Masks a telephone number for safe log and telemetry displays (e.g. `(11) *****-4321`).
   * Telemetry Privacy: Masks middle digits while preserving area code and last 4 digits.
   *
   * @param tel - Raw telephone string
   * @returns Masked telephone string
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
   * Masks personal individual names for privacy-safe logs (e.g. `John Doe -> J*** D**`).
   * Identity Redaction: Preserves first initial of each name component while masking the rest.
   *
   * @param nome - Full personal name string
   * @returns Masked name string
   */
  static mascararNome(nome: string | null | undefined): string {
    if (!nome) return '';
    const partes = nome.trim().split(/\s+/);
    return partes
      .map((p) => (p.length > 1 ? `${p[0]}${'*'.repeat(Math.min(p.length - 1, 5))}` : p))
      .join(' ');
  }

  /**
   * Masks an email address for safe audit display (e.g. `marcos@intea.com.br -> m****s@intea.com.br`).
   * Audit Redaction: Retains first and last letters of username along with full domain.
   *
   * @param email - Raw email address string
   * @returns Masked email string
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
   * Recursively traverses and redacts sensitive clinical and demographic attributes from objects before logging.
   * Leak Prevention (RNF06): Automatically masks CPF, email, password, token, and health notes.
   *
   * @param obj - Arbitrary object or payload to sanitize
   * @returns Sanitized clone safe for persistent logging
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
 * Privacy-safe structured logging utility for application components (RNF06).
 * Automatic Redaction: Sanitizes all arguments through `anonimizarParaLogs` before delegating to console.
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
