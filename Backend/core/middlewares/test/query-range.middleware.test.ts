// ==============================================================================
// InTEA: Suíte de Testes para o Middleware validarIntervaloHistorico (RNF03, RNF05)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import {
  validarIntervaloHistorico,
  type RequestComQueryRange,
} from '../query-range.middleware.js';

describe('validarIntervaloHistorico (Middleware de Saneamento de Query Temporal e Paginação)', () => {
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockImplementation((_code: number) => ({ json: jsonMock }));
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    mockNext = vi.fn();
  });

  describe('Validação de Formato ISO 8601 de Datas', () => {
    it('deve rejeitar requisição com dataInicio em formato inválido retornando HTTP 400', () => {
      const req = {
        query: { dataInicio: 'data-invalida' },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Formato de data inválido para "dataInicio"'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve rejeitar requisição com dataFim em formato inválido retornando HTTP 400', () => {
      const req = {
        query: { dataFim: '2026/13/45' },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Formato de data inválido para "dataFim"'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve aceitar formatos válidos ISO 8601 (YYYY-MM-DD e YYYY-MM-DDTHH:mm:ss.sssZ)', () => {
      const req = {
        query: {
          dataInicio: '2026-01-15',
          dataFim: '2026-03-20T14:30:00.000Z',
        },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
      expect(req.queryRange?.dataInicio).toBeInstanceOf(Date);
      expect(req.queryRange?.dataFim).toBeInstanceOf(Date);
    });
  });

  describe('Validação de Intervalo Temporal (Invertido e Limite Máximo)', () => {
    it('deve bloquear consultas com intervalo temporal invertido (dataInicio > dataFim) com HTTP 400', () => {
      const req = {
        query: {
          dataInicio: '2026-06-10',
          dataFim: '2026-05-01',
        },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Intervalo temporal invertido'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve bloquear intervalos superiores a 24 meses consecutivos retornando HTTP 400', () => {
      const req = {
        query: {
          dataInicio: '2023-01-01',
          dataFim: '2025-06-01', // ~29 meses
        },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('limite máximo permitido de 24 meses'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve permitir intervalo de busca de até exatamente 24 meses consecutivos', () => {
      const req = {
        query: {
          dataInicio: '2024-01-01T00:00:00.000Z',
          dataFim: '2026-01-01T00:00:00.000Z', // Exatamente 24 meses
        },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Clamping e Saneamento de Paginação (RNF05)', () => {
    it('deve aplicar valores padrão (page=1, limit=20) quando parâmetros forem omitidos', () => {
      const req = {
        query: {},
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.queryRange?.page).toBe(1);
      expect(req.queryRange?.limit).toBe(20);
      expect(req.queryRange?.offset).toBe(0);
      expect(req.query.page).toBe('1');
      expect(req.query.limit).toBe('20');
    });

    it('deve aplicar clamping no teto de 100 registros quando limit fornecido for superior', () => {
      const req = {
        query: { limit: '500' },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.queryRange?.limit).toBe(100);
      expect(req.query.limit).toBe('100');
    });

    it('deve normalizar valores negativos ou nulos de limit para o padrão 20', () => {
      const req1 = { query: { limit: '-5' } } as unknown as RequestComQueryRange;
      validarIntervaloHistorico(req1, mockResponse as Response, mockNext);
      expect(req1.queryRange?.limit).toBe(20);

      const req2 = { query: { limit: '0' } } as unknown as RequestComQueryRange;
      validarIntervaloHistorico(req2, mockResponse as Response, mockNext);
      expect(req2.queryRange?.limit).toBe(20);
    });

    it('deve normalizar valores inválidos ou negativos de page para 1', () => {
      const req = {
        query: { page: '-3' },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.queryRange?.page).toBe(1);
      expect(req.query.page).toBe('1');
    });

    it('deve tratar entradas alfanuméricas inválidas com fallback seguro', () => {
      const req = {
        query: { page: 'abc', limit: 'xyz' },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.queryRange?.page).toBe(1);
      expect(req.queryRange?.limit).toBe(20);
      expect(req.queryRange?.offset).toBe(0);
    });

    it('deve calcular corretamente o offset para páginas subsequentes', () => {
      const req = {
        query: { page: '4', limit: '25' },
      } as unknown as RequestComQueryRange;

      validarIntervaloHistorico(req, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(req.queryRange?.page).toBe(4);
      expect(req.queryRange?.limit).toBe(25);
      expect(req.queryRange?.offset).toBe(75); // (4 - 1) * 25 = 75
    });
  });
});
