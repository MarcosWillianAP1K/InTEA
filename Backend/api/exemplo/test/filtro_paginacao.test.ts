import { describe, it, expect } from 'vitest';
import { JogoModel } from '../api/jogos/models/jogo.model.js';
import { JogoController } from '../api/jogos/controllers/jogo.controller.js';
import { Request, Response } from 'express';

describe('Card 2.5 — Back: Filtro por Objetivo e Paginação de Jogos (RF19)', () => {

  const mockRes = () => {
    let statusCode = 200;
    let responseJson: any = null;
    const res = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { responseJson = data; return this; }
    } as unknown as Response;
    return { res, getStatus: () => statusCode, getJson: () => responseJson };
  };

  describe('JogoModel.listar — Filtro por objetivo_clinico', () => {
    it('sem filtros deve retornar todos os 3 jogos do catálogo', async () => {
      const resultado = await JogoModel.listar();
      expect(Array.isArray(resultado.data)).toBe(true);
      expect(resultado.data.length).toBeGreaterThanOrEqual(3);
      expect(resultado.total).toBeGreaterThanOrEqual(3);
    });

    it('filtro por objetivo "foco_atencional" deve retornar apenas "Aventura das Cores"', async () => {
      const resultado = await JogoModel.listar({ objetivo: 'foco_atencional' });
      expect(resultado.data.length).toBe(1);
      expect(resultado.data[0].nome).toBe('Aventura das Cores');
    });

    it('filtro por objetivo "regulacao_emocional" deve retornar apenas "Formas Calmas"', async () => {
      const resultado = await JogoModel.listar({ objetivo: 'regulacao_emocional' });
      expect(resultado.data.length).toBe(1);
      expect(resultado.data[0].nome).toBe('Formas Calmas');
    });

    it('filtro por objetivo "desenvolvimento_linguagem" deve retornar apenas "Som dos Animais"', async () => {
      const resultado = await JogoModel.listar({ objetivo: 'desenvolvimento_linguagem' });
      expect(resultado.data.length).toBe(1);
      expect(resultado.data[0].nome).toBe('Som dos Animais');
    });

    it('filtro por objetivo inexistente deve retornar lista vazia com total 0', async () => {
      const resultado = await JogoModel.listar({ objetivo: 'objetivo_que_nao_existe' });
      expect(resultado.data).toHaveLength(0);
      expect(resultado.total).toBe(0);
    });
  });

  describe('JogoModel.listar — Paginação', () => {
    it('deve retornar os metadados de paginação: page, limit, total e totalPages', async () => {
      const resultado = await JogoModel.listar({ page: 1, limit: 10 });
      expect(resultado).toHaveProperty('data');
      expect(resultado).toHaveProperty('total');
      expect(resultado).toHaveProperty('page');
      expect(resultado).toHaveProperty('limit');
      expect(resultado).toHaveProperty('totalPages');
      expect(resultado.page).toBe(1);
      expect(resultado.limit).toBe(10);
    });

    it('paginação com limit=2 deve retornar apenas 2 jogos por página', async () => {
      const resultado = await JogoModel.listar({ page: 1, limit: 2 });
      expect(resultado.data.length).toBe(2);
      expect(resultado.limit).toBe(2);
      expect(resultado.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('página 2 com limit=2 deve retornar o 3º jogo', async () => {
      const p1 = await JogoModel.listar({ page: 1, limit: 2 });
      const p2 = await JogoModel.listar({ page: 2, limit: 2 });

      expect(p2.data.length).toBeGreaterThanOrEqual(1);

      // Os nomes da página 2 não devem coincidir com os da página 1
      const nomesPg1 = p1.data.map(j => j.nome);
      const nomesPg2 = p2.data.map(j => j.nome);
      const intersecao = nomesPg1.filter(n => nomesPg2.includes(n));
      expect(intersecao).toHaveLength(0);
    });

    it('página além do total disponível deve retornar data vazia', async () => {
      const resultado = await JogoModel.listar({ page: 999, limit: 10 });
      expect(resultado.data).toHaveLength(0);
    });

    it('deve garantir que page é mínimo 1 e limit máximo 100', async () => {
      const r1 = await JogoModel.listar({ page: -5, limit: 10 });
      expect(r1.page).toBe(1);

      const r2 = await JogoModel.listar({ page: 1, limit: 9999 });
      expect(r2.limit).toBe(100);
    });
  });

  describe('JogoController — Endpoint GET /jogos com query params', () => {
    it('deve retornar o payload paginado sem filtro (status 200)', async () => {
      const req = { query: {} } as unknown as Request;
      const { res, getStatus, getJson } = mockRes();

      await JogoController.listar(req, res);

      expect(getStatus()).toBe(200);
      expect(getJson()).toHaveProperty('data');
      expect(getJson()).toHaveProperty('total');
      expect(getJson()).toHaveProperty('page');
      expect(getJson()).toHaveProperty('limit');
      expect(getJson()).toHaveProperty('totalPages');
    });

    it('deve filtrar por ?objetivo=foco_atencional e retornar apenas "Aventura das Cores"', async () => {
      const req = { query: { objetivo: 'foco_atencional' } } as unknown as Request;
      const { res, getStatus, getJson } = mockRes();

      await JogoController.listar(req, res);

      expect(getStatus()).toBe(200);
      expect(getJson().data.length).toBe(1);
      expect(getJson().data[0].nome).toBe('Aventura das Cores');
    });

    it('deve respeitar ?page=2&limit=2 retornando metadados corretos', async () => {
      const req = { query: { page: '2', limit: '2' } } as unknown as Request;
      const { res, getStatus, getJson } = mockRes();

      await JogoController.listar(req, res);

      expect(getStatus()).toBe(200);
      expect(getJson().page).toBe(2);
      expect(getJson().limit).toBe(2);
    });

    it('deve retornar lista vazia para objetivo inexistente com total 0', async () => {
      const req = { query: { objetivo: 'objetivo_fantasma' } } as unknown as Request;
      const { res, getStatus, getJson } = mockRes();

      await JogoController.listar(req, res);

      expect(getStatus()).toBe(200);
      expect(getJson().data).toHaveLength(0);
      expect(getJson().total).toBe(0);
    });
  });
});
