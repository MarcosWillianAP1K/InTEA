import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerapeutaService, TerapeutaServiceError } from '../services/terapeuta.service.js';
import { TerapeutaModel } from '../models/terapeuta.model.js';
import type { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';

describe('TerapeutaService — Camada de Domínio e Regras Profissionais', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listar', () => {
    it('deve normalizar o array de areas_foco ao listar terapeutas', async () => {
      vi.spyOn(TerapeutaModel, 'listar').mockResolvedValue([
        {
          id: 'uuid-terapeuta-1',
          nome: 'Dra. Mariana',
          email: 'mariana@intea.com.br',
          telefone: '+55 (11) 98765-4321',
          crefito: '12345',
          registro_profissional: '12345',
          especialidade: 'TO',
          tempo_experiencia_anos: 5,
          clinica_id: null,
          is_super_admin: false,
          status_ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          areas_foco: [{ areas_foco: { nome: 'Integração Sensorial' } }],
        },
      ]);

      const terapeutas = await TerapeutaService.listar(false);
      expect(terapeutas).toHaveLength(1);
      expect(terapeutas[0].areas_foco).toEqual([{ nome: 'Integração Sensorial' }]);
    });

    it('deve filtrar pela clínica do usuário logado se não for super admin (RN04)', async () => {
      const spyListar = vi.spyOn(TerapeutaModel, 'listar').mockResolvedValue([]);
      const usuarioLogado: UsuarioAutenticado = {
        id: 'uuid-terapeuta-1',
        is_super_admin: false,
        clinica_id: 'uuid-clinica-a',
      };

      await TerapeutaService.listar(false, usuarioLogado);

      expect(spyListar).toHaveBeenCalledWith(false, 'uuid-clinica-a');
    });

    it('não deve filtrar por clínica se o usuário for super admin', async () => {
      const spyListar = vi.spyOn(TerapeutaModel, 'listar').mockResolvedValue([]);
      const usuarioSuperAdmin: UsuarioAutenticado = {
        id: 'uuid-admin-1',
        is_super_admin: true,
        clinica_id: 'uuid-clinica-a',
      };

      await TerapeutaService.listar(false, usuarioSuperAdmin);

      expect(spyListar).toHaveBeenCalledWith(false, undefined);
    });
  });

  describe('buscarPorId', () => {
    it('deve lançar TerapeutaServiceError 400 se ID não for informado', async () => {
      await expect(TerapeutaService.buscarPorId('')).rejects.toThrow(TerapeutaServiceError);
    });

    it('deve lançar TerapeutaServiceError 400 se ID não for UUID válido', async () => {
      await expect(TerapeutaService.buscarPorId('uuid-invalido')).rejects.toThrow(TerapeutaServiceError);
      await expect(TerapeutaService.buscarPorId('uuid-invalido')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve retornar null se o terapeuta não for encontrado no banco', async () => {
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(null);
      const resultado = await TerapeutaService.buscarPorId('00000000-0000-4000-8000-000000000000');
      expect(resultado).toBeNull();
    });

    it('deve permitir acesso se solicitante for da mesma clínica (RN04)', async () => {
      const idAlvo = '11111111-1111-4111-a111-111111111111';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: idAlvo,
        nome: 'Colega de Clínica',
        clinica_id: 'uuid-clinica-x',
        status_ativo: true,
      } as any);

      const usuarioLogado: UsuarioAutenticado = {
        id: '22222222-2222-4222-a222-222222222222',
        is_super_admin: false,
        clinica_id: 'uuid-clinica-x',
      };

      const resultado = await TerapeutaService.buscarPorId(idAlvo, usuarioLogado);
      expect(resultado).not.toBeNull();
      expect(resultado?.id).toBe(idAlvo);
    });

    it('deve lançar 403 se solicitante for de clínica diferente da do terapeuta alvo (RN04)', async () => {
      const idAlvo = '11111111-1111-4111-a111-111111111111';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: idAlvo,
        nome: 'Colega de Outra Clínica',
        clinica_id: 'uuid-clinica-y',
        status_ativo: true,
      } as any);

      const usuarioLogado: UsuarioAutenticado = {
        id: '22222222-2222-4222-a222-222222222222',
        is_super_admin: false,
        clinica_id: 'uuid-clinica-x',
      };

      await expect(TerapeutaService.buscarPorId(idAlvo, usuarioLogado)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('deve permitir acesso de super admin mesmo para clínicas diferentes', async () => {
      const idAlvo = '11111111-1111-4111-a111-111111111111';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: idAlvo,
        nome: 'Terapeuta Qualquer',
        clinica_id: 'uuid-clinica-z',
        status_ativo: true,
      } as any);

      const usuarioSuperAdmin: UsuarioAutenticado = {
        id: '33333333-3333-4333-a333-333333333333',
        is_super_admin: true,
        clinica_id: 'uuid-clinica-x',
      };

      const resultado = await TerapeutaService.buscarPorId(idAlvo, usuarioSuperAdmin);
      expect(resultado?.id).toBe(idAlvo);
    });

    it('deve permitir acesso ao próprio terapeuta independentemente de clínica', async () => {
      const idProprio = '44444444-4444-4444-a444-444444444444';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: idProprio,
        nome: 'Eu Mesmo',
        clinica_id: null,
        status_ativo: true,
      } as any);

      const usuarioLogado: UsuarioAutenticado = {
        id: idProprio,
        is_super_admin: false,
        clinica_id: null,
      };

      const resultado = await TerapeutaService.buscarPorId(idProprio, usuarioLogado);
      expect(resultado?.id).toBe(idProprio);
    });
  });

  describe('criar', () => {
    it('deve formatar o telefone antes de chamar o model de criação', async () => {
      const spyCriar = vi.spyOn(TerapeutaModel, 'criar').mockResolvedValue({
        id: 'uuid-criado',
        nome: 'Dr. Lucas',
        email: 'lucas@intea.com.br',
        telefone: '+55 (11) 98765-4321',
        crefito: null,
        registro_profissional: null,
        especialidade: null,
        tempo_experiencia_anos: 0,
        clinica_id: null,
        is_super_admin: false,
        status_ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await TerapeutaService.criar({
        nome: 'Dr. Lucas',
        email: 'lucas@intea.com.br',
        password: 'senhaSegura123',
        telefone: '11987654321',
      });

      expect(spyCriar).toHaveBeenCalledWith(
        expect.objectContaining({
          telefone: '+55 (11) 98765-4321',
        })
      );
    });

    it('deve lançar TerapeutaServiceError 400 se senha tiver menos de 6 caracteres', async () => {
      await expect(
        TerapeutaService.criar({
          nome: 'Dr. Curto',
          email: 'curto@intea.com.br',
          password: '123',
        })
      ).rejects.toThrow(TerapeutaServiceError);
    });
  });

  describe('desativar (RN05)', () => {
    it('deve lançar TerapeutaServiceError 400 se ID for inválido', async () => {
      await expect(TerapeutaService.desativar('invalido')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve desativar terapeuta ativo retornando jaInativo=false', async () => {
      const idValido = '55555555-5555-4555-a555-555555555555';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: idValido,
        nome: 'Terapeuta Ativo',
        status_ativo: true,
      } as any);

      vi.spyOn(TerapeutaModel, 'desativar').mockResolvedValue({
        id: idValido,
        nome: 'Terapeuta Ativo',
        status_ativo: false,
      } as any);

      const resultado = await TerapeutaService.desativar(idValido);
      expect(resultado.jaInativo).toBe(false);
      expect(resultado.terapeuta.status_ativo).toBe(false);
    });
  });

  describe('atualizar', () => {
    it('deve lançar TerapeutaServiceError 400 se ID for inválido', async () => {
      await expect(TerapeutaService.atualizar('invalido', {})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve bloquear com 403 tentativa de alterar clinica_id por usuário não super admin', async () => {
      const id = '66666666-6666-4666-a666-666666666666';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id,
        nome: 'Dr. Teste',
        clinica_id: 'clinica-a',
        status_ativo: true,
        is_super_admin: false,
        email: 'teste@intea.com',
      } as any);

      const usuario: UsuarioAutenticado = { id, is_super_admin: false };

      await expect(
        TerapeutaService.atualizar(id, { clinica_id: 'clinica-b' }, usuario)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('deve bloquear com 403 tentativa de alterar status_ativo por usuário não super admin', async () => {
      const id = '66666666-6666-4666-a666-666666666666';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id,
        nome: 'Dr. Teste',
        clinica_id: 'clinica-a',
        status_ativo: true,
        is_super_admin: false,
        email: 'teste@intea.com',
      } as any);

      const usuario: UsuarioAutenticado = { id, is_super_admin: false };

      await expect(
        TerapeutaService.atualizar(id, { status_ativo: false }, usuario)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('deve sanitizar o payload removendo propriedades restritas que não sofreram alteração', async () => {
      const id = '66666666-6666-4666-a666-666666666666';
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id,
        nome: 'Dr. Teste',
        clinica_id: 'clinica-a',
        status_ativo: true,
        is_super_admin: false,
        email: 'teste@intea.com',
      } as any);

      const spyAtualizar = vi.spyOn(TerapeutaModel, 'atualizar').mockResolvedValue({
        id,
        nome: 'Dr. Teste Atualizado',
        clinica_id: 'clinica-a',
        status_ativo: true,
        is_super_admin: false,
        email: 'teste@intea.com',
      } as any);

      const usuario: UsuarioAutenticado = { id, is_super_admin: false };
      const dto = {
        nome: 'Dr. Teste Atualizado',
        clinica_id: 'clinica-a', // mesmo valor
        status_ativo: true, // mesmo valor
      };

      await TerapeutaService.atualizar(id, dto, usuario);

      expect(spyAtualizar).toHaveBeenCalledWith(
        id,
        expect.not.objectContaining({ clinica_id: 'clinica-a', status_ativo: true })
      );
    });
  });
});
