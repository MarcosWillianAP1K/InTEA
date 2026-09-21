import { describe, it, expect } from 'vitest';
import { JogoModel } from '../api/jogos/models/jogo.model.js';
import { JogoController } from '../api/jogos/controllers/jogo.controller.js';
import { Request, Response } from 'express';

describe('Card 2.1 — Endpoints do Catálogo de Jogos (RF09)', () => {
  describe('JogoModel', () => {
    it('deve listar os jogos com nome, versão, descrição e status de instalação', async () => {
      const jogos = await JogoModel.listar();

      expect(Array.isArray(jogos)).toBe(true);
      expect(jogos.length).toBeGreaterThanOrEqual(3);

      const jogo = jogos[0];
      expect(jogo).toHaveProperty('id');
      expect(jogo).toHaveProperty('nome');
      expect(jogo).toHaveProperty('versao');
      expect(jogo).toHaveProperty('descricao');
      expect(jogo).toHaveProperty('status_instalacao');
    });

    it('deve retornar os detalhes completos e o manifesto_json ao buscar por ID existente', async () => {
      const jogo = await JogoModel.buscarPorId(1);

      expect(jogo).toBeDefined();
      expect(jogo?.nome).toBe('Aventura das Cores');
      expect(jogo?.manifesto_json).toBeDefined();
      expect(jogo?.manifesto_json.id_jogo).toBe('aventura-das-cores');
      expect(Array.isArray(jogo?.manifesto_json.metricas_suportadas)).toBe(true);
    });

    it('deve retornar undefined ao buscar por ID inexistente', async () => {
      const jogo = await JogoModel.buscarPorId('999999');
      expect(jogo).toBeUndefined();
    });
  });

  describe('JogoController', () => {
    it('listar: deve responder com status 200 e payload no formato { data: [...] }', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {} as Request;
      const mockRes = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseData = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.listar(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseData).toHaveProperty('data');
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data.length).toBeGreaterThanOrEqual(3);
    });

    it('buscarPorId: deve retornar 200 e o jogo com manifesto_json', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: '1' }
      } as unknown as Request;

      const mockRes = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseData = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.buscarPorId(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseData).toHaveProperty('data');
      expect(responseData.data.nome).toBe('Aventura das Cores');
      expect(responseData.data.manifesto_json).toBeDefined();
    });

    it('buscarPorId: deve responder 404 quando o jogo não for encontrado', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: '9999' }
      } as unknown as Request;

      const mockRes = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseData = data;
          return this;
        }
      } as unknown as Response;

      await JogoController.buscarPorId(mockReq, mockRes);

      expect(statusCode).toBe(404);
      expect(responseData).toHaveProperty('error', 'Jogo não encontrado');
    });
  });
});
