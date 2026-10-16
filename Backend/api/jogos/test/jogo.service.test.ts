import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JogoService, JogoServiceError } from '../services/jogo.service.js';
import { JogoModel } from '../models/jogo.model.js';

describe('JogoService — Camada de Domínio, Manifesto e Regras Clínicas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('gerarSlug', () => {
    it('deve converter nome com acentos, maiúsculas e espaços em slug técnico kebab-case', () => {
      const slug = JogoService.gerarSlug('Aventura Espacial: O Desafio dos Sons!');
      expect(slug).toBe('aventura-espacial-o-desafio-dos-sons');
    });
  });

  describe('listar', () => {
    it('deve rejeitar status operacional inválido com JogoServiceError 400', async () => {
      await expect(
        JogoService.listar({ status: 'status_inexistente' as any })
      ).rejects.toThrow(JogoServiceError);
    });

    it('deve aceitar status operacionais permitidos e chamar o model', async () => {
      const spyListar = vi.spyOn(JogoModel, 'listar').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await JogoService.listar({ status: 'manutencao' });
      expect(spyListar).toHaveBeenCalledWith(expect.objectContaining({ status: 'manutencao' }));
    });
  });

  describe('cadastrar', () => {
    it('deve gerar slug automaticamente e rejeitar com 409 se já existir jogo com o mesmo slug', async () => {
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: 1,
        nome: 'Jogo Existente',
        descricao: 'Desc',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'jogo-existente',
          nome: 'Jogo Existente',
          versao: '1.0.0',
          metricas_suportadas: [],
        },
      });

      await expect(
        JogoService.cadastrar({
          nome: 'Jogo Existente',
          descricao: 'Nova descrição',
          versao: '1.0.0',
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve cadastrar com sucesso persistindo o manifesto estruturado com status_jogo', async () => {
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue(undefined);
      const spyCriar = vi.spyOn(JogoModel, 'criar').mockResolvedValue({
        id: 2,
        nome: 'Labirinto Sensorial',
        descricao: 'Jogo para regulação sensorial',
        versao: '1.0.0',
        status_jogo: 'ativo',
        manifesto_json: {
          id_jogo: 'labirinto-sensorial',
          nome: 'Labirinto Sensorial',
          versao: '1.0.0',
          metricas_suportadas: [
            { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 'ms' },
          ],
        },
      });

      const criado = await JogoService.cadastrar({
        nome: 'Labirinto Sensorial',
        descricao: 'Jogo para regulação sensorial',
        versao: '1.0.0',
        status_jogo: 'ativo',
        metricas_suportadas: [
          { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 'ms' },
        ],
      });

      expect(spyCriar).toHaveBeenCalled();
      expect(criado.nome).toBe('Labirinto Sensorial');
    });
  });

  describe('validarTelemetria (RN02)', () => {
    it('deve rejeitar telemetria sem tipo ou fora de domínio com status 422', async () => {
      vi.spyOn(JogoModel, 'buscarPorId').mockResolvedValue({
        id: 1,
        nome: 'Jogo RN02',
        descricao: 'Desc',
        versao: '1.0.0',
        manifesto_json: {
          id_jogo: 'jogo-rn02',
          nome: 'Jogo RN02',
          versao: '1.0.0',
          metricas_suportadas: [
            { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 'ms' },
          ],
        },
      });

      // Métrica não homologada no manifesto
      await expect(
        JogoService.validarTelemetria('jogo-rn02', {
          tipo_evento: 'interacao',
          dados: { id_metrica: 'metrica_desconhecida', valor: 10 },
        })
      ).rejects.toMatchObject({ statusCode: 422, regraViolada: 'RN02 - Fallback de Métrica Proibido' });
    });
  });
});
