import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import type { Request, Response, NextFunction } from 'express';

/**
 * ==============================================================================
 * InTEA: Headers de Segurança HTTP e Proteção CSRF / CORS Estrito (RNF03)
 * ==============================================================================
 * Camada de proteção de rede e cabeçalhos defensivos:
 * 1. Bloqueio total de Clickjacking em prontuários via X-Frame-Options: DENY e CSP frame-ancestors: 'none'.
 * 2. HSTS (Strict-Transport-Security) forçando conexões seguras HTTPS por 1 ano.
 * 3. Content Security Policy (CSP) restritiva com exceções controladas para Swagger UI.
 * 4. Validação estrita de Origem no CORS (apenas origens explicitamente confiáveis).
 * 5. Prevenção de MIME-Sniffing (X-Content-Type-Options: nosniff).
 * 6. Política de Referrer restrita (strict-origin-when-cross-origin).
 * ==============================================================================
 */

/**
 * Default trusted origins for the InTEA ecosystem across development and staging environments.
 * Baseline CORS Policy: Includes local development Vite and Node.js default ports.
 */
export const ORIGENS_PADRAO_DESENVOLVIMENTO: readonly string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * Normalizes an origin URL string by trimming whitespace and trailing slashes.
 * String Sanitation: Produces standard origin representation for accurate matching.
 *
 * @param origem - Raw origin URL string (e.g. "http://localhost:5173/")
 * @returns Normalized origin string without trailing slash
 */
export function normalizarOrigem(origem: string): string {
  return origem.trim().replace(/\/+$/, '');
}

/**
 * Retrieves the complete list of authorized origins from environment variables and defaults.
 * Multi-Tenant Security: Merges FRONTEND_URL, CORS_ALLOWED_ORIGINS, and standard localhost ports.
 *
 * @returns Array of unique authorized origin strings
 */
export function obterOrigensAutorizadas(): string[] {
  const origens: Set<string> = new Set();

  const envOrigins = process.env.CORS_ORIGIN;
  if (envOrigins && envOrigins !== '*') {
    envOrigins.split(',').forEach((origem) => {
      const normalizada = normalizarOrigem(origem);
      if (normalizada) origens.add(normalizada);
    });
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl !== '*') {
    const normalizada = normalizarOrigem(frontendUrl);
    if (normalizada) origens.add(normalizada);
  }

  // Em ambiente de desenvolvimento ou testes, adiciona portas locais padrão do InTEA
  if (process.env.NODE_ENV !== 'production') {
    ORIGENS_PADRAO_DESENVOLVIMENTO.forEach((padrao) => origens.add(padrao));
  }

  return Array.from(origens);
}

/**
 * Verifies whether a requesting HTTP origin is authorized under strict CORS policies.
 * Origin Verification (RNF03): Allows same-origin/internal requests while rejecting untrusted domains.
 *
 * @param origin - Request Origin header value sent by browser
 * @param origensPermitidas - Optional list of authorized origins for testing overrides
 * @returns True if permitted, false if rejected
 */
export function validarOrigemCORS(
  origin: string | undefined,
  origensPermitidas?: string[]
): boolean {
  // Chamadas sem Origin (same-origin, ferramentas CLI, jogos com stack HTTP nativa sem browser)
  if (!origin) {
    return true;
  }

  const lista = origensPermitidas ?? obterOrigensAutorizadas();
  const origemNormalizada = normalizarOrigem(origin);

  return lista.includes(origemNormalizada);
}

/**
 * Helmet security configuration and middleware instance for InTEA HTTP services.
 * HTTP Hardening (RNF03): Enforces strict CSP, HSTS, frameguard, and MIME sniffing protection.
 */
export const securityHeadersMiddleware = helmet({
  // Bloqueia categoricamente clickjacking e injeção em iframes de terceiros (Critério de Aceite 3)
  xFrameOptions: { action: 'deny' },

  // Força HTTPS estrito por 1 ano com subdomínios (HSTS)
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // Impede que navegadores adivinhem o MIME type dos arquivos retornados
  xContentTypeOptions: true,

  // Bloqueia vazamento de URLs clínicas e identificadores sensíveis para terceiros
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Permite que aplicações web autorizadas acessem recursos da API via cross-origin
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // Desativa prefetch automático de DNS para maior privacidade do paciente
  dnsPrefetchControl: { allow: false },

  // Content Security Policy restritiva com compatibilidade para Swagger UI
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', process.env.SUPABASE_URL || '*'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // Bloqueio complementar de clickjacking em navegadores modernos
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
});

/**
 * Standardized CORS options with strict origin validation and credentials support.
 * Cross-Origin Protection: Configures exposed headers, allowed methods, and origin verification.
 */
export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (validarOrigemCORS(origin)) {
      callback(null, true);
    } else {
      callback(
        new Error(`Bloqueado por política de CORS: Origem não autorizada (${origin}).`)
      );
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'x-skip-rate-limit',
    'session-token',
  ],
  maxAge: 86400, // 24 horas de cache para preflight OPTIONS
};

/**
 * Configured CORS middleware protecting endpoints against unauthorized cross-origin requests.
 * Access Control: Rejects non-whitelisted cross-origin calls with appropriate headers.
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Error handling middleware for CORS rejections.
 * Secure Error Handling: Traps unauthorized origin errors and returns standard JSON 403 response.
 *
 * @param err - Error instance caught from middleware pipeline
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function corsErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof Error && err.message.includes('Bloqueado por política de CORS')) {
    res.status(403).json({
      error: 'Origem não autorizada pelas políticas de segurança do InTEA (CORS).',
      message: err.message,
    });
    return;
  }
  next(err);
}
