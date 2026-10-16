import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteService, PacienteServiceError } from '../services/paciente.service.js';
import { PacienteModel } from '../models/paciente.model.js';

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
