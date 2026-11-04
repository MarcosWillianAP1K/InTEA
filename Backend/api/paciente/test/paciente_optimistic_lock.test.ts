// ==============================================================================
// InTEA: Suíte de Testes Unitários - Concorrência Otimista em Paciente (RF18)
// ==============================================================================
// REQUISITOS ATENDIDOS:
// - RF06: Cadastro e Edição de Prontuário Clínico
// - RF18: Suporte à Concorrência Multiusuário / Multiterapeuta
// - RN04: Isolamento Institucional
// - RNF05: SLA e Integridade de Dados
// ==============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PacienteModel, AtualizarPacienteDTO, Paciente } from '../models/paciente.model.js';
import { PacienteService, PacienteServiceError } from '../services/paciente.service.js';
import { PacienteController } from '../controllers/paciente.controller.js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { Request, Response } from 'express';

const PACIENTE_ID = '11111111-2222-4333-8444-555555555555';
const T0_BASE = '2026-10-28T18:00:00.000Z';
const T1_MODIFICADO = '2026-10-28T18:05:00.000Z';
const T2_POSTERIOR = '2026-10-28T18:10:00.000Z';

function criarMockPaciente(overrides: Partial<Paciente> = {}): Paciente {
  return {
    id: PACIENTE_ID,
    nome: 'Lucas Gabriel Silveira',
    data_nascimento: '2019-04-10',
    cpf: '123.456.789-00',
    telefone: '(11) 98765-4321',
    cep: '01310-100',
    cidade: 'São Paulo',
    estado: 'SP',
    endereco: 'Av. Paulista',
    bairro: 'Bela Vista',
    numero: '1000',
    complemento: 'Apto 42',
    clinica_id: 'cccccccc-1111-4111-8111-111111111111',
    status_ativo: true,
    created_at: T0_BASE,
    updated_at: T1_MODIFICADO,
    ...overrides,
  };
}

describe('Controle de Concorrência Otimista (RF18) - Paciente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Testes em PacienteModel.atualizar
  // ============================================================================
  describe('PacienteModel.atualizar (Verificação de ultimo_updated_at)', () => {
    it('deve lançar erro 409 quando o updated_at do banco for mais recente que o ultimo_updated_at recebido', async () => {
      // Simula banco com versão T1_MODIFICADO (18:05)
      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { updated_at: T1_MODIFICADO },
              error: null,
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as ReturnType<typeof supabase.from>;
      });

      // Cliente tenta salvar informando que carregou a versão T0_BASE (18:00)
      const dto: AtualizarPacienteDTO = {
        nome: 'Lucas Gabriel Atualizado',
        ultimo_updated_at: T0_BASE,
      };

      try {
        await PacienteModel.atualizar(PACIENTE_ID, dto);
        expect.unreachable('Deveria ter lançado erro de conflito 409');
      } catch (err: unknown) {
        const erroObj = err as Error & { statusCode?: number; status?: number; detalhes?: Record<string, unknown> };
        expect(erroObj.statusCode || erroObj.status).toBe(409);
        expect(erroObj.message).toBe(
          'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.'
        );
        expect(erroObj.detalhes?.updated_at_banco).toBe(T1_MODIFICADO);
        expect(erroObj.detalhes?.ultimo_updated_at_recebido).toBe(T0_BASE);
      }
    });

    it('deve permitir atualização quando o ultimo_updated_at recebido for igual ou mais recente que o do banco', async () => {
      const mockAtualizado = criarMockPaciente({
        nome: 'Lucas Gabriel Atualizado',
        updated_at: T2_POSTERIOR,
      });

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { updated_at: T1_MODIFICADO },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockAtualizado,
                    error: null,
                  }),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as ReturnType<typeof supabase.from>;
      });

      const dto: AtualizarPacienteDTO = {
        nome: 'Lucas Gabriel Atualizado',
        ultimo_updated_at: T1_MODIFICADO, // Versão idêntica à do banco
      };

      const resultado = await PacienteModel.atualizar(PACIENTE_ID, dto);
      expect(resultado.nome).toBe('Lucas Gabriel Atualizado');
      expect(resultado.updated_at).toBe(T2_POSTERIOR);
    });

    it('deve garantir retrocompatibilidade total quando ultimo_updated_at não for enviado', async () => {
      const mockAtualizado = criarMockPaciente({
        nome: 'Lucas Gabriel Sem Lock',
      });

      let updateChamadoComPayload: Record<string, unknown> | null = null;

      vi.spyOn(supabase, 'from').mockImplementation((tabela: string) => {
        if (tabela === 'paciente') {
          return {
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              updateChamadoComPayload = payload;
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockAtualizado,
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as ReturnType<typeof supabase.from>;
      });

      const dto: AtualizarPacienteDTO = {
        nome: 'Lucas Gabriel Sem Lock',
      };

      const resultado = await PacienteModel.atualizar(PACIENTE_ID, dto);
      expect(resultado.nome).toBe('Lucas Gabriel Sem Lock');
      expect(updateChamadoComPayload).not.toBeNull();
      // Não deve enviar campo de controle de concorrência ao banco
      expect(updateChamadoComPayload).not.toHaveProperty('ultimo_updated_at');
    });
  });

  // ============================================================================
  // 2. Testes em PacienteService.atualizar
  // ============================================================================
  describe('PacienteService.atualizar (Regras de Domínio e Validação)', () => {
    it('deve rejeitar com 409 quando o paciente foi modificado concorrentemente', async () => {
      const pacienteBanco = criarMockPaciente({ updated_at: T1_MODIFICADO });
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteBanco);

      const dto: AtualizarPacienteDTO = {
        telefone: '(11) 99999-8888',
        ultimo_updated_at: T0_BASE, // desatualizado
      };

      try {
        await PacienteService.atualizar(PACIENTE_ID, dto);
        expect.unreachable('Deveria ter lançado erro de conflito 409');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(PacienteServiceError);
        const pErr = err as PacienteServiceError;
        expect(pErr.statusCode).toBe(409);
        expect(pErr.message).toBe(
          'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.'
        );
        expect(pErr.detalhes).toBeDefined();
      }
    });

    it('deve rejeitar com 400 se ultimo_updated_at tiver formato de data inválido', async () => {
      const pacienteBanco = criarMockPaciente();
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteBanco);

      const dto: AtualizarPacienteDTO = {
        nome: 'Teste Data Invalida',
        ultimo_updated_at: 'data-invalida-nao-iso',
      };

      await expect(PacienteService.atualizar(PACIENTE_ID, dto)).rejects.toThrow(
        new PacienteServiceError('Formato inválido para o campo ultimo_updated_at. Utilize formato ISO 8601.', 400)
      );
    });

    it('deve atualizar com sucesso quando ultimo_updated_at for sincronizado', async () => {
      const pacienteBanco = criarMockPaciente({ updated_at: T1_MODIFICADO });
      const pacienteAtualizado = criarMockPaciente({
        telefone: '(11) 99999-8888',
        updated_at: T2_POSTERIOR,
      });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteBanco);
      vi.spyOn(PacienteModel, 'atualizar').mockResolvedValue(pacienteAtualizado);

      const dto: AtualizarPacienteDTO = {
        telefone: '(11) 99999-8888',
        ultimo_updated_at: T1_MODIFICADO,
      };

      const resultado = await PacienteService.atualizar(PACIENTE_ID, dto);
      expect(resultado.telefone).toBe('(11) 99999-8888');
      expect(resultado.updated_at).toBe(T2_POSTERIOR);
    });

    it('deve atualizar normalmente se ultimo_updated_at for omitido (retrocompatibilidade)', async () => {
      const pacienteBanco = criarMockPaciente();
      const pacienteAtualizado = criarMockPaciente({ cidade: 'Campinas' });

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteBanco);
      vi.spyOn(PacienteModel, 'atualizar').mockResolvedValue(pacienteAtualizado);

      const dto: AtualizarPacienteDTO = {
        cidade: 'Campinas',
      };

      const resultado = await PacienteService.atualizar(PACIENTE_ID, dto);
      expect(resultado.cidade).toBe('Campinas');
    });
  });

  // ============================================================================
  // 3. Testes HTTP via PacienteController.atualizar (PUT /api/paciente/:id)
  // ============================================================================
  describe('PacienteController.atualizar (Respostas HTTP)', () => {
    it('deve retornar status 409 Conflict com mensagem explicativa quando houver corrida de edição', async () => {
      vi.spyOn(PacienteService, 'atualizar').mockRejectedValue(
        new PacienteServiceError(
          'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.',
          409,
          {
            updated_at_banco: T1_MODIFICADO,
            ultimo_updated_at_recebido: T0_BASE,
          }
        )
      );

      let statusCode = 0;
      let jsonResult: Record<string, unknown> = {};

      const req = {
        params: { id: PACIENTE_ID },
        body: {
          nome: 'Edição Concorrente',
          ultimo_updated_at: T0_BASE,
        },
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: Record<string, unknown>) {
          jsonResult = data;
          return this;
        },
      } as unknown as Response;

      await PacienteController.atualizar(req, res);

      expect(statusCode).toBe(409);
      expect(jsonResult.error).toBe(
        'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.'
      );
      expect(jsonResult.erros).toEqual({
        updated_at_banco: T1_MODIFICADO,
        ultimo_updated_at_recebido: T0_BASE,
      });
    });

    it('deve retornar status 200 OK quando a atualização com concorrência otimista for bem-sucedida', async () => {
      const pacienteAtualizado = criarMockPaciente({
        nome: 'Nome Atualizado com Sucesso',
        updated_at: T2_POSTERIOR,
      });

      vi.spyOn(PacienteService, 'atualizar').mockResolvedValue(pacienteAtualizado);

      let statusCode = 0;
      let jsonResult: Record<string, unknown> = {};

      const req = {
        params: { id: PACIENTE_ID },
        body: {
          nome: 'Nome Atualizado com Sucesso',
          ultimo_updated_at: T1_MODIFICADO,
        },
      } as unknown as Request;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: Record<string, unknown>) {
          jsonResult = data;
          return this;
        },
      } as unknown as Response;

      await PacienteController.atualizar(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResult.message).toBe('Paciente atualizado com sucesso.');
      const data = jsonResult.data as Record<string, unknown>;
      const pac = data.paciente as Record<string, unknown>;
      expect(pac.nome).toBe('Nome Atualizado com Sucesso');
    });
  });

  // ============================================================================
  // 4. Simulação de Cenário Real de Equipe Multidisciplinar
  // ============================================================================
  describe('Cenário Clínico: Dois Terapeutas Salvando Concorrentemente', () => {
    it('deve barrar a segunda sobrescrita com 409 e permitir salvar após recarregar', async () => {
      // 1. Estado inicial do banco (t0 = 18:00)
      let estadoBanco = criarMockPaciente({
        endereco: 'Rua das Flores, 50',
        telefone: '(11) 91111-1111',
        updated_at: T0_BASE,
      });

      vi.spyOn(PacienteModel, 'buscarPorId').mockImplementation(async () => estadoBanco);
      vi.spyOn(PacienteModel, 'atualizar').mockImplementation(async (_id, dto) => {
        estadoBanco = {
          ...estadoBanco,
          ...dto,
          updated_at: new Date().toISOString(),
        };
        return estadoBanco;
      });

      // Terapeuta 1 e Terapeuta 2 leram T0_BASE
      const versaoTerapeuta1 = T0_BASE;
      const versaoTerapeuta2 = T0_BASE;

      // Terapeuta 1 altera o endereço e salva com sucesso
      const dtoTerapeuta1: AtualizarPacienteDTO = {
        endereco: 'Rua das Flores, 100 (Edifício Solar)',
        ultimo_updated_at: versaoTerapeuta1,
      };
      const resT1 = await PacienteService.atualizar(PACIENTE_ID, dtoTerapeuta1);
      expect(resT1.endereco).toBe('Rua das Flores, 100 (Edifício Solar)');
      // O banco agora possui timestamp posterior a T0_BASE
      expect(new Date(estadoBanco.updated_at).getTime()).toBeGreaterThan(new Date(T0_BASE).getTime());

      // Terapeuta 2 tenta salvar o telefone com sua versão antiga (T0_BASE)
      const dtoTerapeuta2Antigo: AtualizarPacienteDTO = {
        telefone: '(11) 92222-2222',
        ultimo_updated_at: versaoTerapeuta2, // T0_BASE
      };

      // Backend deve REJEITAR com 409 Conflict
      try {
        await PacienteService.atualizar(PACIENTE_ID, dtoTerapeuta2Antigo);
        expect.unreachable('Deveria ter lançado erro de conflito 409');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(PacienteServiceError);
        const pErr = err as PacienteServiceError;
        expect(pErr.statusCode).toBe(409);
        expect(pErr.message).toBe(
          'Os dados deste paciente foram atualizados recentemente por outro especialista da equipe. Recarregue o prontuário antes de salvar.'
        );
      }

      // Terapeuta 2 recarrega o prontuário atualizado (trazendo a nova versão)
      const prontuarioRecarregado = await PacienteService.buscarPorId(PACIENTE_ID);
      expect(prontuarioRecarregado?.endereco).toBe('Rua das Flores, 100 (Edifício Solar)');

      // Terapeuta 2 submete novamente enviando o novo ultimo_updated_at
      const dtoTerapeuta2Atualizado: AtualizarPacienteDTO = {
        telefone: '(11) 92222-2222',
        ultimo_updated_at: prontuarioRecarregado?.updated_at,
      };

      const resT2Novo = await PacienteService.atualizar(PACIENTE_ID, dtoTerapeuta2Atualizado);
      expect(resT2Novo.telefone).toBe('+55 (11) 92222-2222');
      // Preserva o endereço do Terapeuta 1 e atualiza o telefone do Terapeuta 2
      expect(resT2Novo.endereco).toBe('Rua das Flores, 100 (Edifício Solar)');
    });
  });
});
