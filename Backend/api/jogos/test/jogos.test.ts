import { describe, it, expect } from 'vitest';
import { JogoModel } from '../models/jogo.model.js';
import { JogoController } from '../controllers/jogo.controller.js';
import { jogosRoutes } from '../routes/jogo.routes.js';
import { Request, Response } from 'express';

describe('Catálogo de Jogos (RF09)', () => {
  describe('JogoModel', () => {
    it('deve listar os jogos com nome, versão e descrição', async () => {
      const resultado = await JogoModel.listar();

      expect(Array.isArray(resultado.data)).toBe(true);
      expect(resultado.data.length).toBeGreaterThanOrEqual(3);

      const jogo = resultado.data[0];
      expect(jogo).toHaveProperty('nome');
      expect(jogo).toHaveProperty('versao');
      expect(jogo).toHaveProperty('descricao');
      // manifesto_json não deve aparecer na listagem resumida
      expect(jogo).not.toHaveProperty('manifesto_json');
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

      const mockReq = { query: {} } as unknown as Request;
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

    it('buscarPorId: deve retornar 200 com payload unificado e validação do manifesto', async () => {
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
      expect(responseData.data.id).toBe(1);
      expect(responseData.data.nome).toBe('Aventura das Cores');
      expect(responseData.data.descricao).toBeDefined();
      expect(responseData.data.versao).toBe('1.2.0');
      expect(responseData.data.id_jogo).toBe('aventura-das-cores');
      expect(Array.isArray(responseData.data.metricas_suportadas)).toBe(true);
      expect(responseData).toHaveProperty('validacao');
      expect(responseData.validacao.valido).toBe(true);
      expect(responseData.validacao.erros).toHaveLength(0);
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

    it('cadastrar: deve cadastrar jogo com sucesso, gerando id_jogo slug e retornando 201', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        body: {
          nome: 'Super Memória Musical',
          descricao: 'Estimula memória de trabalho e discriminação auditiva.',
          versao: '1.0.0',
          objetivo_clinico: 'desenvolvimento_linguagem',
          metricas_suportadas: [
            {
              id_metrica: 'tempo_memorizacao',
              tipo_metrica: 'numerica',
              unidade: 'segundos'
            }
          ]
        }
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

      await JogoController.cadastrar(mockReq, mockRes);

      expect(statusCode).toBe(201);
      expect(responseData).toHaveProperty('message', 'Jogo cadastrado com sucesso');
      expect(responseData.data).toBeDefined();
      expect(responseData.data.id).toBeDefined();
      expect(responseData.data.id_jogo).toBe('super-memoria-musical');
      expect(responseData.data.nome).toBe('Super Memória Musical');
      expect(responseData.data.descricao).toBe('Estimula memória de trabalho e discriminação auditiva.');
      expect(responseData.data.versao).toBe('1.0.0');
      expect(responseData.data.objetivo_clinico).toBe('desenvolvimento_linguagem');
      expect(responseData.data.metricas_suportadas).toHaveLength(1);
      expect(responseData.validacao.valido).toBe(true);
    });

    it('cadastrar: deve rejeitar com 400 quando faltar campo obrigatório', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        body: {
          descricao: 'Sem nome',
          versao: '1.0.0'
        }
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

      await JogoController.cadastrar(mockReq, mockRes);

      expect(statusCode).toBe(400);
      expect(responseData).toHaveProperty('error');
    });

    it('cadastrar: deve rejeitar com 400 se métricas forem inválidas', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        body: {
          nome: 'Jogo Sem Métricas',
          descricao: 'Descrição qualquer',
          versao: '1.0.0',
          metricas_suportadas: []
        }
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

      await JogoController.cadastrar(mockReq, mockRes);

      expect(statusCode).toBe(400);
      expect(responseData.error).toBe('Manifesto clínico do jogo inválido');
      expect(responseData.erros).toBeDefined();
    });

    it('atualizar: deve atualizar status operacional do jogo com sucesso', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: '1' },
        body: {
          status: 'manutencao',
          descricao: 'Em manutenção para correção de bugs'
        }
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

      await JogoController.atualizar(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseData.data.status).toBe('manutencao');
      expect(responseData.data.descricao).toBe('Em manutenção para correção de bugs');
    });

    it('atualizar: deve rejeitar status inválido com 400', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: '1' },
        body: {
          status: 'status_que_nao_existe'
        }
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

      await JogoController.atualizar(mockReq, mockRes);

      expect(statusCode).toBe(400);
      expect(responseData.error).toContain('Status inválido');
    });

    it('atualizar: deve responder 404 se jogo não existir', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: '999999' },
        body: { status: 'desativado' }
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

      await JogoController.atualizar(mockReq, mockRes);

      expect(statusCode).toBe(404);
      expect(responseData.error).toBe('Jogo não encontrado');
    });

    it('excluir: deve excluir jogo existente com sucesso retornando 200', async () => {
      let responseData: any = null;
      let statusCode = 200;

      // Primeiro cadastramos um jogo para deletar
      const jogoCriado = await JogoModel.criar({
        nome: 'Jogo Para Deletar',
        descricao: 'Teste delete',
        versao: '1.0.0',
        status_jogo: 'desativado',
        manifesto_json: {
          id_jogo: 'jogo-para-deletar',
          nome: 'Jogo Para Deletar',
          versao: '1.0.0',
          metricas_suportadas: [
            { id_metrica: 'm1', tipo_metrica: 'numerica' }
          ]
        }
      });

      const mockReq = {
        params: { id: String(jogoCriado.id) }
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

      await JogoController.excluir(mockReq, mockRes);

      expect(statusCode).toBe(200);
      expect(responseData.message).toBe('Jogo excluído com sucesso');
      expect(responseData.id).toBe(String(jogoCriado.id));

      // Verifica se realmente foi removido
      const conferir = await JogoModel.buscarPorId(jogoCriado.id);
      expect(conferir).toBeUndefined();
    });

    it('excluir: deve responder 404 quando o jogo não existe', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: 'jogo-fantasma-999' }
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

      await JogoController.excluir(mockReq, mockRes);

      expect(statusCode).toBe(404);
      expect(responseData.error).toBe('Jogo não encontrado');
    });

    it('buscarPorId: deve encontrar jogo buscando pelo slug técnico (id_jogo)', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        params: { id: 'aventura-das-cores' }
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
      expect(responseData.data).toBeDefined();
      expect(responseData.data.id_jogo).toBe('aventura-das-cores');
      expect(responseData.data.nome).toBe('Aventura das Cores');
      expect(responseData.data.status).toBeDefined();
    });

    it('gerarSlug: deve sanitizar caracteres especiais, acentos e converter espaços em hífens', () => {
      expect(JogoController.gerarSlug('Super Memória & Emoção!')).toBe('super-memoria-emocao');
      expect(JogoController.gerarSlug('Labirinto das Cores 2')).toBe('labirinto-das-cores-2');
    });

    it('listar: deve rejeitar com 400 se o filtro status for inválido', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        query: { status: 'status_invalido_xyz' }
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

      await JogoController.listar(mockReq, mockRes);

      expect(statusCode).toBe(400);
      expect(responseData.error).toContain('Status inválido para filtro');
    });

    it('cadastrar: deve rejeitar com 409 Conflito se já existir jogo com o mesmo slug', async () => {
      let responseData: any = null;
      let statusCode = 200;

      const mockReq = {
        body: {
          nome: 'Aventura das Cores', // Já existe nos dados de fallback
          descricao: 'Duplicata',
          versao: '1.0.0',
          objetivo_clinico: 'foco_atencional',
          metricas_suportadas: [
            { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 's' }
          ]
        }
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

      await JogoController.cadastrar(mockReq, mockRes);

      expect(statusCode).toBe(409);
      expect(responseData.error).toContain('Já existe um jogo cadastrado');
    });
  });

  describe('Middlewares de Segurança e Autorização (jogosRoutes)', () => {
    it('deve vincular authMiddleware e adminMiddleware nas rotas mutáveis do CRUD e authMiddleware nas de consulta', () => {
      const rotasRegistradas = (jogosRoutes as any).stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
          stackLength: layer.route.stack.length,
          stackNames: layer.route.stack.map((s: any) => s.name)
        }));

      // Rota de listagem não deve exigir adminMiddleware
      const rotaListar = rotasRegistradas.find((r: any) => r.path === '/' && r.methods.includes('get'));
      expect(rotaListar).toBeDefined();
      expect(rotaListar.stackNames).not.toContain('adminMiddleware');

      // Rota de consulta individual (GET /:id) deve ter authMiddleware
      const rotaBuscarId = rotasRegistradas.find((r: any) => r.path === '/:id' && r.methods.includes('get'));
      expect(rotaBuscarId).toBeDefined();
      expect(rotaBuscarId.stackNames).toContain('authMiddleware');
      expect(rotaBuscarId.stackNames).not.toContain('adminMiddleware');

      // Rotas de criação, atualização e exclusão física devem ter authMiddleware e adminMiddleware
      const rotaCadastrar = rotasRegistradas.find((r: any) => r.path === '/' && r.methods.includes('post'));
      expect(rotaCadastrar).toBeDefined();
      expect(rotaCadastrar.stackNames).toContain('authMiddleware');
      expect(rotaCadastrar.stackNames).toContain('adminMiddleware');

      const rotaAtualizarPatch = rotasRegistradas.find((r: any) => r.path === '/:id' && r.methods.includes('patch'));
      expect(rotaAtualizarPatch).toBeDefined();
      expect(rotaAtualizarPatch.stackNames).toContain('authMiddleware');
      expect(rotaAtualizarPatch.stackNames).toContain('adminMiddleware');

      const rotaAtualizarPut = rotasRegistradas.find((r: any) => r.path === '/:id' && r.methods.includes('put'));
      expect(rotaAtualizarPut).toBeDefined();
      expect(rotaAtualizarPut.stackNames).toContain('authMiddleware');
      expect(rotaAtualizarPut.stackNames).toContain('adminMiddleware');

      const rotaExcluir = rotasRegistradas.find((r: any) => r.path === '/:id' && r.methods.includes('delete'));
      expect(rotaExcluir).toBeDefined();
      expect(rotaExcluir.stackNames).toContain('authMiddleware');
      expect(rotaExcluir.stackNames).toContain('adminMiddleware');
    });
  });
});
