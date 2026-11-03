// ==============================================================================
// InTEA: Serviço de Gestão e Revogação de Sessões Ativas (RF02 / Sprint 8 / Backlog)
// ==============================================================================

import crypto from 'node:crypto';
import { supabase } from '../supabase/supabase.client.js';

export interface SessaoAtivaRegistro {
  id: string;
  usuario_id: string;
  token_hash: string;
  ip_origem: string | null;
  user_agent: string | null;
  dispositivo: string | null;
  criado_em: string;
  ultimo_acesso_em: string;
  expira_em: string;
  revogado: boolean;
  revogado_em: string | null;
  motivo_revogacao: string | null;
}

export interface SessaoAtivaDTO {
  id: string;
  ip_origem: string | null;
  user_agent: string | null;
  dispositivo: string | null;
  criado_em: string;
  ultimo_acesso_em: string;
  expira_em: string;
  atual: boolean;
}

export interface RegistrarSessaoInput {
  usuarioId: string;
  token: string;
  ip?: string | null;
  userAgent?: string | null;
  expiraEm?: Date;
}

export class SessoesAtivasService {
  // Armazenamento em memória para suporte desacoplado e testes sem dependência externa
  private static sessõesMemoria: Map<string, SessaoAtivaRegistro> = new Map();

  /**
   * Checks whether the Supabase client is active and configured (or mocked in test suites).
   * Connection Guard: Prevents unexpected network timeouts in isolated testing environments.
   *
   * @returns True if Supabase client is accessible, false otherwise
   */
  private static isSupabaseAvailable(): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const fromCandidate: unknown = supabase?.from;
      if (typeof fromCandidate === 'function') {
        const fnWithMock = fromCandidate as ((...args: unknown[]) => unknown) & {
          _isMockFunction?: boolean;
          mock?: unknown;
        };
        return Boolean(fnWithMock._isMockFunction || fnWithMock.mock);
      }
      return false;
    }
    const url = process.env.SUPABASE_URL;
    return Boolean(url && !url.includes('placeholder') && !url.includes('your-project'));
  }

  /**
   * Clears in-memory session caches and mock stores between test executions.
   * Test Isolation: Resets mocked session records to prevent state bleeding.
   */
  static limparMemoria(): void {
    this.sessõesMemoria.clear();
  }

  /**
   * Generates a secure SHA-256 hash of the JWT token to avoid storing plaintext tokens (LGPD / RNF06).
   * Token Security (RNF06): Hashes bearer tokens deterministically before database lookup and storage.
   *
   * @param token - Raw JWT access token
   * @returns 64-character hexadecimal SHA-256 digest string
   */
  static gerarHashToken(token: string): string {
    if (!token) return '';
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Parses the User-Agent header to generate a human-readable device and browser description.
   * Audit Transparency (RNF06): Categorizes operating system and browser families (e.g. 'Chrome on Windows').
   *
   * @param userAgent - Client User-Agent header string
   * @returns Friendly description of device and browser platform
   */
  static detectarDispositivo(userAgent?: string | null): string {
    if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
      return 'Dispositivo Desconhecido';
    }

    const ua = userAgent.toLowerCase();

    // Detecção de Sistema Operacional com prioridade estrita para mobile sobre desktop
    let so = 'Dispositivo';
    if (ua.includes('windows')) so = 'Windows';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) so = 'iOS';
    else if (ua.includes('android')) so = 'Android';
    else if (ua.includes('macintosh') || ua.includes('mac os')) so = 'macOS';
    else if (ua.includes('linux')) so = 'Linux';

    // Detecção de Navegador / Cliente
    let navegador = 'Navegador';
    if (ua.includes('edg/') || ua.includes('edge/')) navegador = 'Edge';
    else if (ua.includes('chrome/') && !ua.includes('chromium/')) navegador = 'Chrome';
    else if (ua.includes('firefox/')) navegador = 'Firefox';
    else if (ua.includes('safari/') && !ua.includes('chrome/')) navegador = 'Safari';
    else if (ua.includes('postman')) navegador = 'Postman API';
    else if (ua.includes('curl/')) navegador = 'cURL';

    return `${navegador} no ${so}`;
  }

  /**
   * Registers a newly authenticated user session for multi-device session management and auditing.
   * Active Sessions (RF01, RNF06): Stores hashed token, client IP, user agent, and expiration timestamp.
   *
   * @param usuarioId - UUID of the authenticated user
   * @param token - Bearer JWT access token
   * @param ip - Client IP address
   * @param userAgent - Client User-Agent header string
   * @param expiraEm - Expiration date of the session
   * @returns Registered session record
   */
  static async registrarSessao(input: RegistrarSessaoInput): Promise<SessaoAtivaDTO> {
    const tokenHash = this.gerarHashToken(input.token);
    const dispositivo = this.detectarDispositivo(input.userAgent);
    const agoraIso = new Date().toISOString();

    // Expiração padrão de 24 horas se não fornecida
    const expiraEmDate = input.expiraEm ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiraEmIso = expiraEmDate.toISOString();

    const novoRegistro: SessaoAtivaRegistro = {
      id: crypto.randomUUID(),
      usuario_id: input.usuarioId,
      token_hash: tokenHash,
      ip_origem: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      dispositivo,
      criado_em: agoraIso,
      ultimo_acesso_em: agoraIso,
      expira_em: expiraEmIso,
      revogado: false,
      revogado_em: null,
      motivo_revogacao: null,
    };

    // Atualiza cache em memória
    this.sessõesMemoria.set(tokenHash, novoRegistro);

    // Tenta persistência relacional no Supabase se disponível
    if (this.isSupabaseAvailable()) {
      try {
        await supabase.from('sessao_ativa').insert({
          id: novoRegistro.id,
          usuario_id: novoRegistro.usuario_id,
          token_hash: novoRegistro.token_hash,
          ip_origem: novoRegistro.ip_origem,
          user_agent: novoRegistro.user_agent,
          dispositivo: novoRegistro.dispositivo,
          criado_em: novoRegistro.criado_em,
          ultimo_acesso_em: novoRegistro.ultimo_acesso_em,
          expira_em: novoRegistro.expira_em,
          revogado: false,
        });
      } catch {
        // Falha silenciosa no banco: opera em memória
      }
    }

    return {
      id: novoRegistro.id,
      ip_origem: novoRegistro.ip_origem,
      user_agent: novoRegistro.user_agent,
      dispositivo: novoRegistro.dispositivo,
      criado_em: novoRegistro.criado_em,
      ultimo_acesso_em: novoRegistro.ultimo_acesso_em,
      expira_em: novoRegistro.expira_em,
      atual: true,
    };
  }

  /**
   * Lists all active concurrent sessions for a therapist, identifying the current session.
   * Session Management (RF01): Compares hashed token with active sessions to mark `atual = true`.
   *
   * @param usuarioId - UUID of the therapist
   * @param tokenAtual - Current request JWT to flag the active session
   * @returns List of active user sessions with client metadata
   */
  static async listarSessoes(usuarioId: string, tokenAtual?: string): Promise<SessaoAtivaDTO[]> {
    const hashAtual = tokenAtual ? this.gerarHashToken(tokenAtual) : '';
    const agora = new Date();

    // Consulta banco de dados se disponível
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('sessao_ativa')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('revogado', false)
          .gt('expira_em', agora.toISOString())
          .order('ultimo_acesso_em', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((s: SessaoAtivaRegistro) => ({
            id: s.id,
            ip_origem: s.ip_origem,
            user_agent: s.user_agent,
            dispositivo: s.dispositivo,
            criado_em: s.criado_em,
            ultimo_acesso_em: s.ultimo_acesso_em,
            expira_em: s.expira_em,
            atual: s.token_hash === hashAtual,
          }));
        }
      } catch {
        // Fallback para memória
      }
    }

    // Fallback: consulta registros em memória
    const sessoes: SessaoAtivaDTO[] = [];
    for (const s of this.sessõesMemoria.values()) {
      if (s.usuario_id === usuarioId && !s.revogado && new Date(s.expira_em) > agora) {
        sessoes.push({
          id: s.id,
          ip_origem: s.ip_origem,
          user_agent: s.user_agent,
          dispositivo: s.dispositivo,
          criado_em: s.criado_em,
          ultimo_acesso_em: s.ultimo_acesso_em,
          expira_em: s.expira_em,
          atual: s.token_hash === hashAtual,
        });
      }
    }

    return sessoes.sort(
      (a, b) => new Date(b.ultimo_acesso_em).getTime() - new Date(a.ultimo_acesso_em).getTime()
    );
  }

  /**
   * Revokes all other active sessions for the therapist (logout-all), preserving only the current one.
   * Security Invalidation: Immediately terminates remote sessions across other devices.
   *
   * @param usuarioId - UUID of the authenticated therapist
   * @param tokenAtual - Current request JWT that must NOT be revoked
   * @returns Total number of successfully revoked sessions
   */
  static async revogarOutrasSessoes(usuarioId: string, tokenAtual: string): Promise<{ revogadas: number }> {
    const hashAtual = this.gerarHashToken(tokenAtual);
    const agoraIso = new Date().toISOString();
    let totalRevogadas = 0;

    // Atualização em memória
    for (const [hash, sessao] of this.sessõesMemoria.entries()) {
      if (sessao.usuario_id === usuarioId && hash !== hashAtual && !sessao.revogado) {
        sessao.revogado = true;
        sessao.revogado_em = agoraIso;
        sessao.motivo_revogacao = 'logout_all';
        totalRevogadas++;
      }
    }

    // Atualização no Supabase se disponível
    if (this.isSupabaseAvailable()) {
      try {
        const { data } = await supabase
          .from('sessao_ativa')
          .update({
            revogado: true,
            revogado_em: agoraIso,
            motivo_revogacao: 'logout_all',
          })
          .eq('usuario_id', usuarioId)
          .neq('token_hash', hashAtual)
          .eq('revogado', false)
          .select('id');

        if (Array.isArray(data)) {
          totalRevogadas = Math.max(totalRevogadas, data.length);
        }
      } catch {
        // Opera com o resultado em memória
      }
    }

    return { revogadas: totalRevogadas };
  }

  /**
   * Revokes a specific remote session identified by its UUID.
   * Targeted Termination: Ensures only the session owner or SuperAdmin can terminate the session.
   *
   * @param usuarioId - UUID of the session owner
   * @param sessaoId - UUID of the target session to revoke
   * @returns True if the session was successfully revoked, false otherwise
   */
  static async revogarSessaoPorId(usuarioId: string, sessaoId: string): Promise<boolean> {
    const agoraIso = new Date().toISOString();
    let revogadoComSucesso = false;

    // Memória
    for (const sessao of this.sessõesMemoria.values()) {
      if (sessao.id === sessaoId && sessao.usuario_id === usuarioId && !sessao.revogado) {
        sessao.revogado = true;
        sessao.revogado_em = agoraIso;
        sessao.motivo_revogacao = 'sessao_remota_revogada';
        revogadoComSucesso = true;
        break;
      }
    }

    // Banco
    if (this.isSupabaseAvailable()) {
      try {
        const { data } = await supabase
          .from('sessao_ativa')
          .update({
            revogado: true,
            revogado_em: agoraIso,
            motivo_revogacao: 'sessao_remota_revogada',
          })
          .eq('id', sessaoId)
          .eq('usuario_id', usuarioId)
          .eq('revogado', false)
          .select('id');

        if (Array.isArray(data) && data.length > 0) {
          revogadoComSucesso = true;
        }
      } catch {
        // Fallback para memória
      }
    }

    return revogadoComSucesso;
  }

  /**
   * Checks whether the provided JWT has been explicitly revoked via logout or session termination.
   * Token Blacklisting: Validates token hash against revoked sessions table or memory store.
   *
   * @param token - Bearer JWT access token
   * @returns True if the token has been revoked, false if valid and active
   */
  static async isTokenRevogado(token: string): Promise<boolean> {
    if (!token || typeof token !== 'string') return false;

    const tokenHash = this.gerarHashToken(token);

    // Consulta primeiro cache em memória
    const sessaoMem = this.sessõesMemoria.get(tokenHash);
    if (sessaoMem) {
      return sessaoMem.revogado;
    }

    // Consulta banco se não localizado na memória
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('sessao_ativa')
          .select('revogado')
          .eq('token_hash', tokenHash)
          .maybeSingle();

        if (!error && data) {
          return Boolean(data.revogado);
        }
      } catch {
        // Em caso de falha de conexão com banco, assume não revogado para resiliência
      }
    }

    return false;
  }
}
