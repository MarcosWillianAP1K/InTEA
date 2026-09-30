// ==============================================================================
// InTEA: Testes Básicos de Inicialização e Serviços da Feature Sessão
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { sessaoRoutes } from '../routes/sessao.routes.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';
import { SessaoModel } from '../models/sessao.model.js';

describe('Feature Sessão - Estrutura e Serviços Base', () => {
  it('deve exportar as rotas de sessão corretamente', () => {
    expect(sessaoRoutes).toBeDefined();
  });

  it('deve gerar código de pareamento no formato alfanumérico XXXX-XXXX', () => {
    const token = SessaoTokenService.gerarCodigoPareamento();
    expect(token).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it('deve expor métodos estáticos do SessaoModel', () => {
    expect(typeof SessaoModel.criar).toBe('function');
    expect(typeof SessaoModel.buscarPorId).toBe('function');
    expect(typeof SessaoModel.buscarPorToken).toBe('function');
    expect(typeof SessaoModel.atualizarStatus).toBe('function');
  });

  it('deve responder com o código de pareamento no formato XXXX-XXXX via controller', async () => {
    let jsonResult: unknown = null;
    let statusCode = 200;

    const mockReq = {} as unknown as import('express').Request;
    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        jsonResult = data;
        return this;
      }
    } as unknown as import('express').Response;

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.gerarCodigoPareamento(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonResult).toBeDefined();
    expect((jsonResult as { codigo: string }).codigo).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it('deve rejeitar atualização de status quando o campo status estiver ausente', async () => {
    let statusCode = 200;
    let jsonResult: unknown = null;

    const mockReq = {
      params: { id: 'sessao-123' },
      body: {}
    } as unknown as import('express').Request;

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        jsonResult = data;
        return this;
      }
    } as unknown as import('express').Response;

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(statusCode).toBe(400);
    expect((jsonResult as { error: string }).error).toContain('obrigatório');
  });

  it('deve rejeitar atualização de status com valor inválido fora dos permitidos', async () => {
    let statusCode = 200;
    let jsonResult: unknown = null;

    const mockReq = {
      params: { id: 'sessao-123' },
      body: { status: 'status_inventado' }
    } as unknown as import('express').Request;

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        jsonResult = data;
        return this;
      }
    } as unknown as import('express').Response;

    const { SessaoController } = await import('../controllers/sessao.controller.js');
    await SessaoController.atualizarStatus(mockReq, mockRes);

    expect(statusCode).toBe(400);
    expect((jsonResult as { error: string }).error).toContain('inválido');
  });
});
