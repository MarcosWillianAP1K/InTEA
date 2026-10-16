import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerapeutaService, TerapeutaServiceError } from '../services/terapeuta.service.js';
import { TerapeutaModel } from '../models/terapeuta.model.js';

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
  });

  describe('buscarPorId', () => {
    it('deve lançar TerapeutaServiceError 400 se ID não for informado', async () => {
      await expect(TerapeutaService.buscarPorId('')).rejects.toThrow(TerapeutaServiceError);
    });

    it('deve retornar null se o terapeuta não for encontrado no banco', async () => {
      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue(null);
      const resultado = await TerapeutaService.buscarPorId('uuid-inexistente');
      expect(resultado).toBeNull();
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
    it('deve desativar terapeuta ativo retornando jaInativo=false', async () => {
      const idValido = 'uuid-terapeuta-ativo';
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
});
