import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Request, Response } from 'express';
import http from 'node:http';
import {
  securityHeadersMiddleware,
  corsMiddleware,
  corsErrorHandler,
  validarOrigemCORS,
  obterOrigensAutorizadas,
  normalizarOrigem,
} from '../security-headers.middleware.js';

describe('Middleware de Headers de Segurança HTTP e Proteção CSRF/CORS (RNF03)', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    app = express();
    app.use(securityHeadersMiddleware);
    app.use(corsMiddleware);
    app.use(express.json());

    // Rota de teste clínico simulado
    app.get('/api/paciente/prontuario', (_req: Request, res: Response) => {
      res.json({ data: { prontuario: 'Dados clínicos confidenciais' }, message: 'Sucesso' });
    });

    app.post('/api/sessao/iniciar', (_req: Request, res: Response) => {
      res.status(201).json({ data: { session_token: 'token-abc' }, message: 'Sessão iniciada' });
    });

    // Tratamento de erros de CORS
    app.use(corsErrorHandler);

    // Sobe servidor em porta dinâmica livre para testes
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  describe('Critério 1: Headers de proteção presentes em 100% das respostas HTTP da API', () => {
    it('deve injetar headers HSTS, X-Content-Type-Options, CSP e Referrer-Policy em requisições GET', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`);

      expect(resposta.status).toBe(200);

      // X-Content-Type-Options: nosniff (impede MIME-sniffing)
      expect(resposta.headers.get('x-content-type-options')).toBe('nosniff');

      // Strict-Transport-Security: HSTS com 1 ano e subdomínios
      const hsts = resposta.headers.get('strict-transport-security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');

      // Referrer-Policy restritivo
      expect(resposta.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

      // Cross-Origin-Resource-Policy
      expect(resposta.headers.get('cross-origin-resource-policy')).toBe('cross-origin');

      // Content-Security-Policy restritiva
      const csp = resposta.headers.get('content-security-policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('deve injetar headers de proteção também em respostas de mutação POST (201 Created)', async () => {
      const resposta = await fetch(`${baseUrl}/api/sessao/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(resposta.status).toBe(201);
      expect(resposta.headers.get('x-content-type-options')).toBe('nosniff');
      expect(resposta.headers.get('x-frame-options')).toBe('DENY');
    });
  });

  describe('Critério 2: Requisições com origens não autorizadas no CORS são bloqueadas', () => {
    it('deve permitir requisições de origens autorizadas (ex: http://localhost:5173) com headers CORS válidos', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`, {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });

      expect(resposta.status).toBe(200);
      expect(resposta.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
      expect(resposta.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('deve bloquear com status 403 requisições vindas de origens não autorizadas (ex: http://malicious-site.com)', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`, {
        headers: {
          Origin: 'http://malicious-site.com',
        },
      });

      expect(resposta.status).toBe(403);
      // Não deve emitir o header de autorização CORS para o invasor
      expect(resposta.headers.get('access-control-allow-origin')).toBeNull();

      const corpo = (await resposta.json()) as { error: string; message: string };
      expect(corpo.error).toContain('Origem não autorizada pelas políticas de segurança do InTEA (CORS)');
      expect(corpo.message).toContain('http://malicious-site.com');
    });

    it('deve bloquear preflight OPTIONS de origens maliciosas', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://evil-attacker.org',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(resposta.status).toBe(403);
      expect(resposta.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('deve aceitar requisições de clientes sem header Origin (ex: chamadas nativas de tablet e ferramentas)', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`);
      expect(resposta.status).toBe(200);
    });
  });

  describe('Critério 3: Bloqueio de injeção em iframes externos para proteção de telas clínicas', () => {
    it('deve emitir explicitamente o header X-Frame-Options: DENY', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`);
      expect(resposta.headers.get('x-frame-options')).toBe('DENY');
    });

    it('deve definir frame-ancestors: none na Content Security Policy impedindo clickjacking em qualquer contexto', async () => {
      const resposta = await fetch(`${baseUrl}/api/paciente/prontuario`);
      const csp = resposta.headers.get('content-security-policy') || '';

      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('Utilitários de Validação de Domínio e Normalização CORS', () => {
    it('normalizarOrigem deve remover barras finais e espaços em branco', () => {
      expect(normalizarOrigem('  http://localhost:5173/// ')).toBe('http://localhost:5173');
      expect(normalizarOrigem('https://intea.ufpi.br/')).toBe('https://intea.ufpi.br');
    });

    it('validarOrigemCORS deve aceitar origens da lista branca e rejeitar ataques de subdomínio', () => {
      const permitidas = ['http://localhost:5173', 'https://intea.ufpi.br'];

      expect(validarOrigemCORS('http://localhost:5173', permitidas)).toBe(true);
      expect(validarOrigemCORS('https://intea.ufpi.br', permitidas)).toBe(true);
      expect(validarOrigemCORS(undefined, permitidas)).toBe(true);

      // Rejeita tentativas de spoofing por prefixo/sufixo
      expect(validarOrigemCORS('http://localhost:5173.attacker.com', permitidas)).toBe(false);
      expect(validarOrigemCORS('https://attacker-intea.ufpi.br', permitidas)).toBe(false);
      expect(validarOrigemCORS('http://evil.com', permitidas)).toBe(false);
    });

    it('obterOrigensAutorizadas deve ler CORS_ORIGIN e FRONTEND_URL de variáveis de ambiente', () => {
      process.env.CORS_ORIGIN = 'https://app1.intea.com, https://app2.intea.com';
      process.env.FRONTEND_URL = 'https://frontend.intea.com';

      const origens = obterOrigensAutorizadas();

      expect(origens).toContain('https://app1.intea.com');
      expect(origens).toContain('https://app2.intea.com');
      expect(origens).toContain('https://frontend.intea.com');
    });
  });
});
