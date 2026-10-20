import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteService, PacienteServiceError } from '../services/paciente.service.js';
import { PacienteModel } from '../models/paciente.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('PacienteService — Camada de Domínio e Regras Clínicas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listar', () => {
    it('deve injetar terapeutaId do usuário logado se não for super admin (RN04)', async () => {
      const spyListar = vi.spyOn(PacienteModel, 'listar').mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const usuarioComum = { id: 'terapeuta-uuid-1', is_super_admin: false };
      await PacienteService.listar({}, usuarioComum);

      expect(spyListar).toHaveBeenCalledWith(
        expect.objectContaining({ terapeutaId: 'terapeuta-uuid-1' })
      );
    });

    it('não deve injetar terapeutaId se usuário for super admin e verTodosPacientes=true', async () => {
      const spyListar = vi.spyOn(PacienteModel, 'listar').mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const superAdmin = { id: 'admin-uuid-1', is_super_admin: true };
      await PacienteService.listar({}, superAdmin, true);

      expect(spyListar.mock.calls[0]?.[0]?.terapeutaId).toBeUndefined();
    });

    it('deve lançar PacienteServiceError 403 se usuário comum tentar listar todos com verTodosPacientes=true (RN04)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_super_admin: false, status_ativo: true },
        error: null,
      });
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSingle,
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const usuarioComum = { id: 'terapeuta-uuid-1', is_super_admin: false };

      await expect(
        PacienteService.listar({}, usuarioComum, true)
      ).rejects.toThrow(PacienteServiceError);

      await expect(
        PacienteService.listar({}, usuarioComum, true)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Acesso negado: apenas administradores podem visualizar todos os pacientes.',
      });
    });

    it('deve reconhecer admin via tabela terapeuta no Supabase quando não presente no JWT/metadata e verTodosPacientes=true', async () => {
      const spyListar = vi.spyOn(PacienteModel, 'listar').mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_super_admin: true, status_ativo: true },
        error: null,
      });
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSingle,
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      // Usuário sem flag de super admin no JWT
      const usuarioBanco = { id: 'admin-uuid-db', is_super_admin: false };
      await PacienteService.listar({}, usuarioBanco, true);

      expect(spyListar).toHaveBeenCalled();
      expect(spyListar.mock.calls[0]?.[0]?.terapeutaId).toBeUndefined();
    });

    it('deve lançar PacienteServiceError 403 se usuário for admin mas com status_ativo=false e verTodosPacientes=true', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { is_super_admin: true, status_ativo: false },
        error: null,
      });
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSingle,
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const adminInativo = { id: 'admin-inativo-uuid', is_super_admin: false };

      await expect(
        PacienteService.listar({}, adminInativo, true)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Acesso negado: apenas administradores podem visualizar todos os pacientes.',
      });
    });

    it('deve lançar PacienteServiceError 403 se verTodosPacientes=true e usuário não estiver autenticado', async () => {
      await expect(
        PacienteService.listar({}, undefined, true)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Acesso negado: apenas administradores podem visualizar todos os pacientes.',
      });
    });
  });

  describe('buscarPorId', () => {
    it('deve lançar PacienteServiceError 400 se ID não for UUID válido', async () => {
      await expect(PacienteService.buscarPorId('id-invalido')).rejects.toThrow(PacienteServiceError);
      await expect(PacienteService.buscarPorId('id-invalido')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve normalizar arrays de responsaveis e terapeutas sem quebrar', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        nome: 'Paciente Teste',
        data_nascimento: '2015-01-01',
        status_ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        clinica_id: null,
        telefone: null,
        cpf: null,
        cep: null,
        cidade: null,
        estado: null,
        endereco: null,
        bairro: null,
        numero: null,
        complemento: null,
        responsaveis: [{ responsavel: { nome: 'Mãe Teste' } }],
        terapeutas: [{ terapeuta: { nome: 'Terapeuta Teste' } }],
      });

      const paciente = await PacienteService.buscarPorId('123e4567-e89b-12d3-a456-426614174000');
      expect(paciente).toBeDefined();
      expect(paciente?.responsaveis?.[0]).toEqual({ nome: 'Mãe Teste' });
      expect(paciente?.terapeutas?.[0]).toEqual({ nome: 'Terapeuta Teste' });
    });
  });

  describe('criar', () => {
    it('deve formatar CPF, CEP e telefone antes de persistir no banco', async () => {
      const spyCriar = vi.spyOn(PacienteModel, 'criar').mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        nome: 'Paciente Com Mascara',
        data_nascimento: '2018-05-10',
        cpf: '529.982.247-25',
        cep: '01310-100',
        telefone: '+55 (11) 98765-4321',
        status_ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        clinica_id: null,
        cidade: null,
        estado: null,
        endereco: null,
        bairro: null,
        numero: null,
        complemento: null,
      });

      await PacienteService.criar({
        nome: 'Paciente Com Mascara',
        data_nascimento: '2018-05-10',
        cpf: '52998224725',
        cep: '01310100',
        telefone: '11987654321',
      });

      expect(spyCriar).toHaveBeenCalledWith(
        expect.objectContaining({
          cpf: '529.982.247-25',
          cep: '01310-100',
          telefone: '+55 (11) 98765-4321',
        })
      );
    });

    it('deve rejeitar com PacienteServiceError 400 se validação estrutural falhar', async () => {
      await expect(
        PacienteService.criar({
          nome: '',
          data_nascimento: 'data-errada',
          cpf: '123',
        })
      ).rejects.toThrow(PacienteServiceError);
    });

    it('deve forçar clinica_id do terapeuta e auto-vincular criador quando usuarioLogado não for super admin (RN04)', async () => {
      const { TerapeutaModel } = await import('../../terapeuta/models/terapeuta.model.js');
      const terapeutaLogadoId = '11111111-1111-4111-a111-111111111111';
      const clinicaRealId = '22222222-2222-4222-a222-222222222222';

      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: terapeutaLogadoId,
        nome: 'Dra. Terapeuta',
        clinica_id: clinicaRealId,
        status_ativo: true,
      } as any);

      const spyCriar = vi.spyOn(PacienteModel, 'criar').mockResolvedValue({
        id: '33333333-3333-4333-a333-333333333333',
        nome: 'Paciente Criado',
        data_nascimento: '2019-01-01',
        cpf: '529.982.247-25',
        clinica_id: clinicaRealId,
        status_ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const usuarioLogado = {
        id: terapeutaLogadoId,
        is_super_admin: false,
      };

      await PacienteService.criar(
        {
          nome: 'Paciente Criado',
          data_nascimento: '2019-01-01',
          cpf: '52998224725',
          clinica_id: 'tentativa-spoofing-clinica-falsa',
        },
        usuarioLogado
      );

      // Deve ter forçado clinica_id da terapeuta e repassado o ID do criador
      expect(spyCriar).toHaveBeenCalledWith(
        expect.objectContaining({
          clinica_id: clinicaRealId,
        }),
        terapeutaLogadoId
      );
    });

    it('deve rejeitar com 403 se o terapeuta requisitante estiver inativo', async () => {
      const { TerapeutaModel } = await import('../../terapeuta/models/terapeuta.model.js');
      const terapeutaLogadoId = '11111111-1111-4111-a111-111111111111';

      vi.spyOn(TerapeutaModel, 'buscarPorId').mockResolvedValue({
        id: terapeutaLogadoId,
        nome: 'Dra. Inativa',
        clinica_id: 'clinica-qualquer',
        status_ativo: false,
      } as any);

      const usuarioLogado = {
        id: terapeutaLogadoId,
        is_super_admin: false,
      };

      await expect(
        PacienteService.criar(
          {
            nome: 'Paciente Teste',
            data_nascimento: '2019-01-01',
            cpf: '52998224725',
          },
          usuarioLogado
        )
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('desativar (RN05)', () => {
    it('deve aplicar soft delete retornando jaInativo=false para paciente ativo', async () => {
      const idValido = '123e4567-e89b-12d3-a456-426614174000';
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
        id: idValido,
        nome: 'Paciente Ativo',
        status_ativo: true,
      } as any);

      vi.spyOn(PacienteModel, 'desativar').mockResolvedValue({
        id: idValido,
        nome: 'Paciente Ativo',
        status_ativo: false,
      } as any);

      const resultado = await PacienteService.desativar(idValido);
      expect(resultado.jaInativo).toBe(false);
      expect(resultado.paciente.status_ativo).toBe(false);
    });
  });
});
