import { describe, it, expect, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import {
  loginRateLimiter,
  parearRateLimiter,
  resetarRateLimits,
} from '../rate-limit.middleware.js';

describe('Core Middleware: Rate Limiting Contra Força Bruta (RNF03)', () => {
  beforeEach(() => {
    resetarRateLimits();
  });

  describe('loginRateLimiter (Proteção de Autenticação)', () => {
    it('deve permitir até 5 tentativas consecutivas de login para o mesmo IP', async () => {
      let chamadasExecutadas = 0;
      const nextFn = () => {
        chamadasExecutadas++;
      };

      for (let i = 0; i < 5; i++) {
        const req = {
          ip: '192.168.1.100',
          headers: {},
        } as unknown as Request;

        const res = {
          setHeader: () => {},
          status: () => res,
          json: () => {},
        } as unknown as Response;

        await loginRateLimiter(req, res, nextFn);
      }

      expect(chamadasExecutadas).toBe(5);
    });

    it('deve bloquear a 6ª tentativa de login com HTTP 429 e header Retry-After', async () => {
      let chamadasExecutadas = 0;
      const nextFn = () => {
        chamadasExecutadas++;
      };

      // Simula 5 tentativas permitidas
      for (let i = 0; i < 5; i++) {
        const req = {
          ip: '192.168.1.101',
          headers: {},
        } as unknown as Request;

        const res = {
          setHeader: () => {},
          status: () => res,
          json: () => {},
        } as unknown as Response;

        await loginRateLimiter(req, res, nextFn);
      }
      expect(chamadasExecutadas).toBe(5);

      // 6ª tentativa: deve ser bloqueada
      let statusRetornado = 0;
      let bodyRetornado: unknown = null;
      const headersSet: Record<string, string> = {};

      const reqBloqueado = {
        ip: '192.168.1.101',
        headers: {},
      } as unknown as Request;

      const resBloqueado = {
        setHeader: (name: string, value: string) => {
          headersSet[name] = value;
        },
        status: (code: number) => {
          statusRetornado = code;
          return resBloqueado;
        },
        json: (data: unknown) => {
          bodyRetornado = data;
        },
      } as unknown as Response;

      await loginRateLimiter(reqBloqueado, resBloqueado, nextFn);

      // Não deve chamar next() na 6ª tentativa
      expect(chamadasExecutadas).toBe(5);
      expect(statusRetornado).toBe(429);
      expect(headersSet['Retry-After']).toBeDefined();
      expect(Number(headersSet['Retry-After'])).toBeGreaterThan(0);

      const bodyObj = bodyRetornado as { error: string; detalhes: string; retryAfter: number };
      expect(bodyObj.error).toContain('Muitas tentativas de login');
      expect(bodyObj.retryAfter).toBeGreaterThan(0);
    });

    it('deve permitir bypass se x-skip-rate-limit estiver presente', async () => {
      let chamadasExecutadas = 0;
      const nextFn = () => {
        chamadasExecutadas++;
      };

      // Executa 7 requisições com x-skip-rate-limit
      for (let i = 0; i < 7; i++) {
        const req = {
          ip: '192.168.1.102',
          headers: { 'x-skip-rate-limit': 'true' },
        } as unknown as Request;

        const res = {
          setHeader: () => {},
          status: () => res,
          json: () => {},
        } as unknown as Response;

        await loginRateLimiter(req, res, nextFn);
      }

      expect(chamadasExecutadas).toBe(7);
    });
  });

  describe('parearRateLimiter (Proteção do PIN de Pareamento)', () => {
    it('deve permitir até 10 checagens de PIN por IP na mesma janela', async () => {
      let chamadasExecutadas = 0;
      const nextFn = () => {
        chamadasExecutadas++;
      };

      for (let i = 0; i < 10; i++) {
        const req = {
          ip: '10.0.0.50',
          headers: {},
        } as unknown as Request;

        const res = {
          setHeader: () => {},
          status: () => res,
          json: () => {},
        } as unknown as Response;

        await parearRateLimiter(req, res, nextFn);
      }

      expect(chamadasExecutadas).toBe(10);
    });

    it('deve bloquear a 11ª checagem de PIN com HTTP 429 e header Retry-After', async () => {
      let chamadasExecutadas = 0;
      const nextFn = () => {
        chamadasExecutadas++;
      };

      for (let i = 0; i < 10; i++) {
        const req = {
          ip: '10.0.0.51',
          headers: {},
        } as unknown as Request;

        const res = {
          setHeader: () => {},
          status: () => res,
          json: () => {},
        } as unknown as Response;

        await parearRateLimiter(req, res, nextFn);
      }
      expect(chamadasExecutadas).toBe(10);

      // 11ª tentativa
      let statusRetornado = 0;
      let bodyRetornado: unknown = null;
      const headersSet: Record<string, string> = {};

      const reqBloqueado = {
        ip: '10.0.0.51',
        headers: {},
      } as unknown as Request;

      const resBloqueado = {
        setHeader: (name: string, value: string) => {
          headersSet[name] = value;
        },
        status: (code: number) => {
          statusRetornado = code;
          return resBloqueado;
        },
        json: (data: unknown) => {
          bodyRetornado = data;
        },
      } as unknown as Response;

      await parearRateLimiter(reqBloqueado, resBloqueado, nextFn);

      expect(chamadasExecutadas).toBe(10);
      expect(statusRetornado).toBe(429);
      expect(headersSet['Retry-After']).toBeDefined();
      expect(Number(headersSet['Retry-After'])).toBeGreaterThan(0);

      const bodyObj = bodyRetornado as { error: string; detalhes: string; retryAfter: number };
      expect(bodyObj.error).toContain('Muitas tentativas de pareamento');
    });
  });

  describe('resetarRateLimits', () => {
    it('deve limpar os contadores permitindo novas requisições após o reset', async () => {
      let chamadasExecutadas = 0;
      const nextFn = () => {
        chamadasExecutadas++;
      };

      const req = {
        ip: '172.16.0.5',
        headers: {},
      } as unknown as Request;

      const res = {
        setHeader: () => {},
        status: () => res,
        json: () => {},
      } as unknown as Response;

      // Executa 5 vezes (limite esgotado)
      for (let i = 0; i < 5; i++) {
        await loginRateLimiter(req, res, nextFn);
      }
      expect(chamadasExecutadas).toBe(5);

      // Reseta
      resetarRateLimits();

      // Agora a 6ª tentativa deve passar porque o store foi limpo
      await loginRateLimiter(req, res, nextFn);
      expect(chamadasExecutadas).toBe(6);
    });
  });
});
