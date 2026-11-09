import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PacienteService, PacienteServiceError } from '../services/paciente.service.js';
import { PacienteController } from '../controllers/paciente.controller.js';
import { PacienteModel } from '../models/paciente.model.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { CryptoService } from '../../../core/security/crypto.service.js';

describe('PacienteService — Camada de Domínio e Regras Clínicas', () => {
  const idValido = '123e4567-e89b-12d3-a456-426614174000';

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

    it('deve listar sem injetar terapeutaId quando usuarioLogado não for informado e verTodosPacientes=false', async () => {
      const spyListar = vi.spyOn(PacienteModel, 'listar').mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await PacienteService.listar({});
      expect(spyListar).toHaveBeenCalledWith({});
    });

    it('não deve injetar terapeutaId se usuário for super admin (flag direta ou user_metadata) e verTodosPacientes=true', async () => {
      const spyListar = vi.spyOn(PacienteModel, 'listar').mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const superAdmin = { id: 'admin-uuid-1', is_super_admin: true };
      await PacienteService.listar({}, superAdmin, true);
      expect(spyListar.mock.calls[0]?.[0]?.terapeutaId).toBeUndefined();

      const superAdminMeta = {
        id: 'admin-uuid-2',
        app_metadata: { is_super_admin: true },
      };
      await PacienteService.listar({}, superAdminMeta, true);
      expect(spyListar.mock.calls[1]?.[0]?.terapeutaId).toBeUndefined();
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
    it('deve lançar PacienteServiceError 400 se ID estiver vazio, undefined ou não for UUID válido', async () => {
      await expect(PacienteService.buscarPorId('')).rejects.toMatchObject({ statusCode: 400 });
      await expect(PacienteService.buscarPorId('undefined')).rejects.toMatchObject({ statusCode: 400 });
      await expect(PacienteService.buscarPorId('id-invalido')).rejects.toThrow(PacienteServiceError);
      await expect(PacienteService.buscarPorId('id-invalido')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve retornar null se o paciente não existir no banco', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(null);
      const resultado = await PacienteService.buscarPorId(idValido);
      expect(resultado).toBeNull();
    });

    it('deve normalizar arrays de responsaveis e terapeutas (aninhados e achatados) e decifrar dados_clinicos', async () => {
      const spyDecifrar = vi
        .spyOn(CryptoService, 'decifrarSeCifrado')
        .mockImplementation((txt: string) => `decifrado:${txt}`);

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
        id: idValido,
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
        responsaveis: [{ responsavel: { nome: 'Mãe Teste' } }, { nome: 'Pai Direto' }],
        terapeutas: [{ terapeuta: { nome: 'Terapeuta Teste' } }, { nome: 'Terapeuta Direto' }],
        dados_clinicos: {
          diagnostico_base: 'cifrado-diag',
          observacoes_gerais: 'cifrado-obs',
        },
      } as unknown as Awaited<ReturnType<typeof PacienteModel.buscarPorId>>);

      const paciente = await PacienteService.buscarPorId(idValido);
      expect(paciente).toBeDefined();
      expect(paciente?.responsaveis?.[0]).toEqual({ nome: 'Mãe Teste' });
      expect(paciente?.responsaveis?.[1]).toEqual({ nome: 'Pai Direto' });
      expect(paciente?.terapeutas?.[0]).toEqual({ nome: 'Terapeuta Teste' });
      expect(paciente?.terapeutas?.[1]).toEqual({ nome: 'Terapeuta Direto' });
      expect(spyDecifrar).toHaveBeenCalledTimes(2);
    });

    it('deve retornar arrays vazios quando responsaveis e terapeutas não forem arrays', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
        id: idValido,
        nome: 'Paciente Sem Arrays',
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
      });

      const paciente = await PacienteService.buscarPorId(idValido);
      expect(paciente?.responsaveis).toEqual([]);
      expect(paciente?.terapeutas).toEqual([]);
    });
  });

  describe('criar', () => {
    it('deve formatar CPF, CEP, telefone, responsável e cifrar dados_clinicos antes de persistir no banco', async () => {
      const spyCifrar = vi
        .spyOn(CryptoService, 'cifrarSeNaoCifrado')
        .mockImplementation((txt: string) => `enc:${txt}`);

      const spyCriar = vi.spyOn(PacienteModel, 'criar').mockResolvedValue({
        id: idValido,
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

      const payload = {
        nome: 'Paciente Com Mascara',
        data_nascimento: '2018-05-10',
        cpf: '52998224725',
        cep: '01310100',
        telefone: '11987654321',
        responsavel: {
          nome: 'Responsável Teste',
          cpf: '11144477735',
          telefone: '11999998888',
        },
        dados_clinicos: {
          diagnostico_base: 'TEA Nível 1',
          observacoes_gerais: 'Hipersensibilidade auditiva',
        },
      };

      await PacienteService.criar(payload, {
        id: '99999999-9999-4999-8999-999999999999',
        is_super_admin: true,
      });

      expect(spyCifrar).toHaveBeenCalledTimes(2);
      expect(spyCriar).toHaveBeenCalledWith(
        expect.objectContaining({
          cpf: '529.982.247-25',
          cep: '01310-100',
          telefone: '+55 (11) 98765-4321',
          responsavel: expect.objectContaining({
            cpf: '111.444.777-35',
            telefone: '+55 (11) 99999-8888',
          }),
        }),
        '99999999-9999-4999-8999-999999999999'
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
      } as unknown as Awaited<ReturnType<typeof TerapeutaModel.buscarPorId>>);

      const spyCriar = vi.spyOn(PacienteModel, 'criar').mockResolvedValue({
        id: '33333333-3333-4333-a333-333333333333',
        nome: 'Paciente Criado',
        data_nascimento: '2019-01-01',
        cpf: '529.982.247-25',
        clinica_id: clinicaRealId,
        status_ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Awaited<ReturnType<typeof PacienteModel.criar>>);

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
      } as unknown as Awaited<ReturnType<typeof TerapeutaModel.buscarPorId>>);

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

  describe('atualizar', () => {
    it('deve rejeitar com 400 se ID for vazio, undefined, UUID inválido ou DTO inválido', async () => {
      await expect(PacienteService.atualizar('', { nome: 'Novo' })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(PacienteService.atualizar('undefined', { nome: 'Novo' })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(PacienteService.atualizar('invalido', { nome: 'Novo' })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(
        PacienteService.atualizar(idValido, { data_nascimento: 'invalida' })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('deve rejeitar com 404 quando paciente não existir para atualização', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(null);

      await expect(
        PacienteService.atualizar(idValido, { nome: 'Nome Valido' })
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('deve formatar CPF, CEP e telefone e atualizar quando paciente existir', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue({
        id: idValido,
        nome: 'Paciente Existente',
        status_ativo: true,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.buscarPorId>>);

      const spyAtualizar = vi.spyOn(PacienteModel, 'atualizar').mockResolvedValue({
        id: idValido,
        nome: 'Paciente Atualizado',
        status_ativo: true,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.atualizar>>);

      const resultado = await PacienteService.atualizar(idValido, {
        nome: 'Paciente Atualizado',
        cpf: '52998224725',
        cep: '01310100',
        telefone: '11987654321',
      });

      expect(resultado.nome).toBe('Paciente Atualizado');
      expect(spyAtualizar).toHaveBeenCalledWith(
        idValido,
        expect.objectContaining({
          cpf: '529.982.247-25',
          cep: '01310-100',
          telefone: '+55 (11) 98765-4321',
        })
      );
    });
  });

  describe('desativar, reativar, deletarHard e utilitários LGPD (RN05 / RNF06)', () => {
    it('desativar deve validar ID (400), existência (404), paciente já inativo (jaInativo=true) e paciente ativo (jaInativo=false)', async () => {
      await expect(PacienteService.desativar('')).rejects.toMatchObject({ statusCode: 400 });
      await expect(PacienteService.desativar('nao-uuid')).rejects.toMatchObject({ statusCode: 400 });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce(null);
      await expect(PacienteService.desativar(idValido)).rejects.toMatchObject({ statusCode: 404 });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce({
        id: idValido,
        nome: 'Paciente Ja Inativo',
        status_ativo: false,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.buscarPorId>>);
      const resJaInativo = await PacienteService.desativar(idValido);
      expect(resJaInativo.jaInativo).toBe(true);

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce({
        id: idValido,
        nome: 'Paciente Ativo',
        status_ativo: true,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.buscarPorId>>);

      vi.spyOn(PacienteModel, 'desativar').mockResolvedValueOnce({
        id: idValido,
        nome: 'Paciente Ativo',
        status_ativo: false,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.desativar>>);

      const resultado = await PacienteService.desativar(idValido);
      expect(resultado.jaInativo).toBe(false);
      expect(resultado.paciente.status_ativo).toBe(false);
    });

    it('reativar deve validar ID (400), existência (404) e reativar paciente com sucesso', async () => {
      await expect(PacienteService.reativar('')).rejects.toMatchObject({ statusCode: 400 });
      await expect(PacienteService.reativar('nao-uuid')).rejects.toMatchObject({ statusCode: 400 });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce(null);
      await expect(PacienteService.reativar(idValido)).rejects.toMatchObject({ statusCode: 404 });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce({
        id: idValido,
        nome: 'Paciente Inativo',
        status_ativo: false,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.buscarPorId>>);
      vi.spyOn(PacienteModel, 'reativar').mockResolvedValueOnce({
        id: idValido,
        nome: 'Paciente Inativo',
        status_ativo: true,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.reativar>>);

      const reativado = await PacienteService.reativar(idValido);
      expect(reativado.status_ativo).toBe(true);
    });

    it('deletarHard deve validar ID (400), existência (404) e remover paciente com sucesso', async () => {
      await expect(PacienteService.deletarHard('')).rejects.toMatchObject({ statusCode: 400 });
      await expect(PacienteService.deletarHard('nao-uuid')).rejects.toMatchObject({
        statusCode: 400,
      });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce(null);
      await expect(PacienteService.deletarHard(idValido)).rejects.toMatchObject({
        statusCode: 404,
      });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce({
        id: idValido,
        nome: 'Paciente Dev',
        status_ativo: true,
      } as unknown as Awaited<ReturnType<typeof PacienteModel.buscarPorId>>);
      const spyHard = vi.spyOn(PacienteModel, 'deletarHard').mockResolvedValueOnce();

      await expect(PacienteService.deletarHard(idValido)).resolves.toBeUndefined();
      expect(spyHard).toHaveBeenCalledWith(idValido);
    });

    it('deve delegar anonimizarParaLogs, cifrarDadoSensivel e decifrarDadoSensivel ao CryptoService (RNF06)', () => {
      const spyAnon = vi.spyOn(CryptoService, 'anonimizarParaLogs').mockReturnValue({ cpf: '***' });
      const spyCifrar = vi.spyOn(CryptoService, 'cifrar').mockReturnValue('cipher-text');
      const spyDecifrar = vi.spyOn(CryptoService, 'decifrar').mockReturnValue('plain-text');

      expect(PacienteService.anonimizarParaLogs({ cpf: '123' })).toEqual({ cpf: '***' });
      expect(PacienteService.cifrarDadoSensivel('segredo')).toBe('cipher-text');
      expect(PacienteService.decifrarDadoSensivel('cipher-text')).toBe('plain-text');

      expect(spyAnon).toHaveBeenCalled();
      expect(spyCifrar).toHaveBeenCalledWith('segredo');
      expect(spyDecifrar).toHaveBeenCalledWith('cipher-text');
    });
  });

  describe('Gestão de Vínculos Multidisciplinares (vincularTerapeuta, desvincularTerapeuta, listarTerapeutas)', () => {
    const pacienteId = '11111111-1111-4111-8111-111111111111';
    const terapeutaAId = '22222222-2222-4222-8222-222222222222';
    const terapeutaBId = '33333333-3333-4333-8333-333333333333';
    const superAdminId = '99999999-9999-4999-8999-999999999999';

    describe('PacienteService.vincularTerapeuta', () => {
      it('deve rejeitar com 400 se pacienteId ou terapeutaId não forem UUIDs válidos', async () => {
        await expect(
          PacienteService.vincularTerapeuta('invalido', terapeutaBId)
        ).rejects.toMatchObject({ statusCode: 400 });

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, 'invalido')
        ).rejects.toMatchObject({ statusCode: 400 });
      });

      it('deve rejeitar com 403 quando requisitante não for o Terapeuta Responsável (Líder) nem SuperAdmin', async () => {
        vi.spyOn(PacienteModel, 'obterTerapeutaResponsavel').mockResolvedValue(terapeutaAId);
        const spyVincular = vi.spyOn(PacienteModel, 'vincularTerapeuta');

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId, {
            id: terapeutaBId,
            is_super_admin: false,
          })
        ).rejects.toMatchObject({
          statusCode: 403,
          message:
            'Acesso negado: apenas o Terapeuta Responsável (Líder) ou um SuperAdmin podem adicionar especialistas à equipe deste paciente.',
        });

        expect(spyVincular).not.toHaveBeenCalled();
      });

      it('deve permitir vinculação pelo Terapeuta Responsável (Líder) ou SuperAdmin', async () => {
        vi.spyOn(PacienteModel, 'obterTerapeutaResponsavel').mockResolvedValue(terapeutaAId);
        const spyVincular = vi.spyOn(PacienteModel, 'vincularTerapeuta').mockResolvedValue();

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId, {
            id: terapeutaAId,
            is_super_admin: false,
          })
        ).resolves.toBeUndefined();

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId, {
            id: superAdminId,
            is_super_admin: true,
          })
        ).resolves.toBeUndefined();

        expect(spyVincular).toHaveBeenCalledTimes(2);
      });

      it('deve converter erro de clínica divergente em PacienteServiceError 403 (RN04)', async () => {
        vi.spyOn(PacienteModel, 'vincularTerapeuta').mockRejectedValue(
          new Error('Bloqueio de segurança: Não é permitido vincular terapeutas de clínicas diferentes.')
        );

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId)
        ).rejects.toMatchObject({
          statusCode: 403,
          message: 'Bloqueio de segurança: Não é permitido vincular terapeutas de clínicas diferentes.',
        });
      });

      it('deve converter erro de vínculo duplicado em PacienteServiceError 409', async () => {
        vi.spyOn(PacienteModel, 'vincularTerapeuta').mockRejectedValue(
          new Error('Conflito de vínculo: o terapeuta informado já está vinculado a este paciente.')
        );

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId)
        ).rejects.toMatchObject({
          statusCode: 409,
        });
      });

      it('deve converter erro de paciente ou terapeuta inexistente em PacienteServiceError 404 e inativo em 400', async () => {
        vi.spyOn(PacienteModel, 'vincularTerapeuta').mockRejectedValueOnce(
          new Error('Terapeuta não encontrado para vinculação.')
        );

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId)
        ).rejects.toMatchObject({
          statusCode: 404,
        });

        vi.spyOn(PacienteModel, 'vincularTerapeuta').mockRejectedValueOnce(
          new Error('Não é possível vincular um terapeuta inativo.')
        );

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId)
        ).rejects.toMatchObject({
          statusCode: 400,
        });
      });

      it('deve vincular com sucesso quando o Model concluir sem erros', async () => {
        const spyVincular = vi.spyOn(PacienteModel, 'vincularTerapeuta').mockResolvedValue();

        await expect(
          PacienteService.vincularTerapeuta(pacienteId, terapeutaBId)
        ).resolves.toBeUndefined();
        expect(spyVincular).toHaveBeenCalledWith(pacienteId, terapeutaBId);
      });
    });

    describe('PacienteService.desvincularTerapeuta (Governança do Líder, SuperAdmin e Prevenção Anti-Órfão)', () => {
      it('deve rejeitar com 400 se pacienteId ou terapeutaId não forem UUIDs válidos', async () => {
        await expect(
          PacienteService.desvincularTerapeuta('invalido', terapeutaBId)
        ).rejects.toMatchObject({ statusCode: 400 });

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, 'invalido')
        ).rejects.toMatchObject({ statusCode: 400 });
      });

      it('deve rejeitar com 403 quando especialista comum (não Líder) tentar desvincular vínculo da equipe', async () => {
        vi.spyOn(PacienteModel, 'obterTerapeutaResponsavel').mockResolvedValue(terapeutaAId);
        const spyDesvincular = vi.spyOn(PacienteModel, 'desvincularTerapeuta');

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaAId, {
            id: terapeutaBId,
            is_super_admin: false,
          })
        ).rejects.toMatchObject({
          statusCode: 403,
          message:
            'Acesso negado: apenas o Terapeuta Responsável (Líder) ou um SuperAdmin podem remover vínculos da equipe.',
        });

        expect(spyDesvincular).not.toHaveBeenCalled();
      });

      it('deve permitir que o Terapeuta Responsável (Líder) desvincule outro especialista da equipe quando há outro ativo', async () => {
        vi.spyOn(PacienteModel, 'obterTerapeutaResponsavel').mockResolvedValue(terapeutaAId);
        const spyDesvincular = vi
          .spyOn(PacienteModel, 'desvincularTerapeuta')
          .mockResolvedValue('removido');

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaBId, {
            id: terapeutaAId,
            is_super_admin: false,
          })
        ).resolves.toBeUndefined();

        expect(spyDesvincular).toHaveBeenCalledWith(pacienteId, terapeutaBId);
      });

      it('deve permitir que SuperAdmin desvincule outro terapeuta quando restar especialista ativo (inclusive via fallback no banco)', async () => {
        const spyDesvincular = vi
          .spyOn(PacienteModel, 'desvincularTerapeuta')
          .mockResolvedValue('removido');

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaBId, {
            id: superAdminId,
            is_super_admin: true,
          })
        ).resolves.toBeUndefined();

        expect(spyDesvincular).toHaveBeenCalledWith(pacienteId, terapeutaBId);

        // Teste com is_super_admin = false no objeto mas true na tabela terapeuta do banco
        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { is_super_admin: true, status_ativo: true },
                error: null,
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>);

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaBId, {
            id: superAdminId,
            is_super_admin: false,
          })
        ).resolves.toBeUndefined();

        expect(spyDesvincular).toHaveBeenCalledTimes(2);
      });

      it('deve rejeitar com 409 quando o terapeuta for o último especialista ativo vinculado (anti-órfão)', async () => {
        vi.spyOn(PacienteModel, 'desvincularTerapeuta').mockResolvedValue('ultimo_ativo');

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaAId, {
            id: terapeutaAId,
            is_super_admin: false,
          })
        ).rejects.toMatchObject({
          statusCode: 409,
          message:
            'Operação bloqueada: não é permitido remover o único especialista vinculado ao paciente. Vincule outro profissional da clínica antes de realizar a transferência.',
        });
      });

      it('deve rejeitar com 404 quando o vínculo ou paciente não existir', async () => {
        vi.spyOn(PacienteModel, 'desvincularTerapeuta').mockResolvedValueOnce('nao_vinculado');

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaBId, {
            id: terapeutaBId,
            is_super_admin: false,
          })
        ).rejects.toMatchObject({
          statusCode: 404,
          message: 'Vínculo não encontrado para este paciente e terapeuta.',
        });

        vi.spyOn(PacienteModel, 'desvincularTerapeuta').mockRejectedValueOnce(
          new Error('Paciente não encontrado para desvincular terapeuta.')
        );

        await expect(
          PacienteService.desvincularTerapeuta(pacienteId, terapeutaBId)
        ).rejects.toMatchObject({
          statusCode: 404,
        });
      });
    });

    describe('PacienteService.listarTerapeutas', () => {
      it('deve validar UUID (400), paciente não encontrado (404) e retornar EspecialistaVinculado[] com crefito e created_at', async () => {
        await expect(PacienteService.listarTerapeutas('invalido')).rejects.toMatchObject({
          statusCode: 400,
        });

        vi.spyOn(PacienteModel, 'listarTerapeutasVinculados').mockRejectedValueOnce(
          new Error('Paciente não encontrado ao listar terapeutas vinculados.')
        );
        await expect(PacienteService.listarTerapeutas(pacienteId)).rejects.toMatchObject({
          statusCode: 404,
        });

        const mockEquipe = [
          {
            id: terapeutaAId,
            nome: 'Dr. Terapeuta A',
            email: 'a@intea.com.br',
            telefone: null,
            crefito: 'CREFITO-111',
            registro_profissional: 'CREFITO-111',
            especialidade: 'Terapia Ocupacional',
            created_at: '2026-10-01T10:00:00.000Z',
            eh_responsavel: true,
            papel_equipe: 'Especialista Responsável' as const,
          },
        ];

        vi.spyOn(PacienteModel, 'listarTerapeutasVinculados').mockResolvedValueOnce(mockEquipe);

        const resultado = await PacienteService.listarTerapeutas(pacienteId);

        expect(resultado).toHaveLength(1);
        expect(resultado[0]?.crefito).toBe('CREFITO-111');
        expect(resultado[0]?.created_at).toBe('2026-10-01T10:00:00.000Z');
        expect(resultado[0]?.eh_responsavel).toBe(true);
      });
    });

    describe('PacienteModel: buscarVinculo, contarTerapeutasAtivosVinculados e desvincularTerapeuta (RPC e Fallback)', () => {
      it('buscarVinculo deve retornar true quando o vínculo existir e false quando não existir', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValueOnce({ data: { paciente_id: pacienteId }, error: null })
                  .mockResolvedValueOnce({ data: null, error: null }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>);

        const existe = await PacienteModel.buscarVinculo(pacienteId, terapeutaAId);
        const naoExiste = await PacienteModel.buscarVinculo(pacienteId, terapeutaBId);

        expect(existe).toBe(true);
        expect(naoExiste).toBe(false);
      });

      it('contarTerapeutasAtivosVinculados deve ignorar terapeutas inativos e o terapeuta excluído', async () => {
        const terapeutaInativoId = '44444444-4444-4444-8444-444444444444';

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  terapeuta_id: terapeutaAId,
                  terapeuta: { id: terapeutaAId, status_ativo: true },
                },
                {
                  terapeuta_id: terapeutaBId,
                  terapeuta: { id: terapeutaBId, status_ativo: true },
                },
                {
                  terapeuta_id: terapeutaInativoId,
                  terapeuta: { id: terapeutaInativoId, status_ativo: false },
                },
              ],
              error: null,
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>);

        const totalAtivos = await PacienteModel.contarTerapeutasAtivosVinculados(pacienteId);
        expect(totalAtivos).toBe(2);

        const ativosExcluindoA = await PacienteModel.contarTerapeutasAtivosVinculados(
          pacienteId,
          terapeutaAId
        );
        expect(ativosExcluindoA).toBe(1);
      });

      it('desvincularTerapeuta deve utilizar supabase.rpc(desvincular_terapeuta_seguro) quando disponível', async () => {
        vi.spyOn(supabase, 'from').mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: pacienteId }, error: null }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>);

        const supabaseComRpc = supabase as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ data: string; error: null }>;
        };
        const spyRpc = vi
          .spyOn(supabaseComRpc, 'rpc')
          .mockResolvedValue({ data: 'ultimo_ativo', error: null });

        const resultado = await PacienteModel.desvincularTerapeuta(pacienteId, terapeutaAId);

        expect(spyRpc).toHaveBeenCalledWith('desvincular_terapeuta_seguro', {
          p_paciente_id: pacienteId,
          p_terapeuta_id: terapeutaAId,
        });
        expect(resultado).toBe('ultimo_ativo');
      });

      it('desvincularTerapeuta deve acionar fallback determinístico quando rpc não estiver mockado', async () => {
        const mockDeleteEqTerapeuta = vi.fn().mockResolvedValue({ error: null });
        const mockDeleteEqPaciente = vi.fn().mockReturnValue({ eq: mockDeleteEqTerapeuta });

        vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
          if (tabela === 'paciente') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: pacienteId }, error: null }),
                }),
              }),
            } as unknown as ReturnType<typeof supabase.from>;
          }
          return {
            delete: vi.fn().mockReturnValue({ eq: mockDeleteEqPaciente }),
          } as unknown as ReturnType<typeof supabase.from>;
        });

        vi.spyOn(PacienteModel, 'buscarVinculo').mockResolvedValue(true);
        vi.spyOn(PacienteModel, 'contarTerapeutasAtivosVinculados').mockResolvedValue(1);

        const resultado = await PacienteModel.desvincularTerapeuta(pacienteId, terapeutaBId);

        expect(resultado).toBe('removido');
        expect(mockDeleteEqPaciente).toHaveBeenCalledWith('paciente_id', pacienteId);
        expect(mockDeleteEqTerapeuta).toHaveBeenCalledWith('terapeuta_id', terapeutaBId);
      });
    });

    describe('Consentimento Parental (LGPD Art. 14 §1º)', () => {
      it('GET /:id/consentimento deve consultar histórico e retornar status vigente', async () => {
        const mockOrder = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'cons-1',
              paciente_id: idValido,
              versao_termo: 'v1.0',
              consentimento_concedido: true,
              revogado_em: null,
              created_at: '2026-10-10T10:00:00Z',
            },
          ],
          error: null,
        });
        const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        vi.spyOn(supabase, 'from').mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof supabase.from>);

        const req = { params: { id: idValido } } as unknown as Parameters<typeof PacienteController.obterConsentimento>[0];
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Parameters<typeof PacienteController.obterConsentimento>[1];

        await PacienteController.obterConsentimento(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              vigente: true,
              ultimo_consentimento: expect.objectContaining({ id: 'cons-1', versao_termo: 'v1.0' }),
            }),
          })
        );
      });

      it('POST /:id/consentimento deve registrar novo termo de consentimento com defaults seguros e retornar 201', async () => {
        const terapeutaId = '22222222-2222-4222-8222-222222222222';
        const mockSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'cons-2',
            paciente_id: idValido,
            terapeuta_id: terapeutaId,
            versao_termo: 'v1.0',
            consentimento_concedido: true,
            canal_coleta: 'presencial_web',
          },
          error: null,
        });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        vi.spyOn(supabase, 'from').mockReturnValue({ insert: mockInsert } as unknown as ReturnType<typeof supabase.from>);

        const req = {
          params: { id: idValido },
          user: { id: terapeutaId },
          headers: { 'user-agent': 'Vitest' },
          ip: '127.0.0.1',
          body: { observacoes: 'Termo assinado presencialmente pela mãe' },
        } as unknown as Parameters<typeof PacienteController.registrarConsentimento>[0];
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Parameters<typeof PacienteController.registrarConsentimento>[1];

        await PacienteController.registrarConsentimento(req, res);

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            paciente_id: idValido,
            terapeuta_id: terapeutaId,
            versao_termo: 'v1.0',
            consentimento_concedido: true,
            canal_coleta: 'presencial_web',
          })
        );
        expect(res.status).toHaveBeenCalledWith(201);
      });
    });
  });
});
