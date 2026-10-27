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
 * Origens confiáveis padrão do ecossistema InTEA em desenvolvimento e homologação.
 */
export const ORIGENS_PADRAO_DESENVOLVIMENTO: readonly string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * Normaliza uma string de URL de origem removendo barra final e espaços.
 */
export function normalizarOrigem(origem: string): string {
  return origem.trim().replace(/\/+$/, '');
}

/**
 * Recupera a lista completa de origens autorizadas com base nas variáveis de ambiente.
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
 * Verifica se uma origem HTTP solicitante é autorizada pelas políticas estritas de CORS.
 * - Requisições sem header Origin (ex: chamadas nativas de tablets, curl, server-to-server) são aceitas.
 * - Requisições de navegadores web com Origin DEVEM constar na lista branca explícita.
 *
 * @param origin - Header Origin enviado pelo navegador.
 * @param origensPermitidas - Lista opcional de origens para sobrescrita em testes.
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
 * Configuração e instância do Helmet para o InTEA.
 * Aplica políticas rígidas de isolamento de frames e CSP restritiva.
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
 * Opções padronizadas de CORS com validação estrita de origens.
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
 * Middleware de CORS configurado com proteção contra origens não autorizadas.
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Middleware para tratamento seguro de rejeições de CORS.
 * Captura erros de origem não autorizada e retorna HTTP 403 Forbidden padronizado.
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
