// ==============================================================================
// InTEA: Suíte de Testes para Exportação de Prontuário Longitudinal (RF20, RNF06)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  PacienteExportarHistoricoService,
  mascararCpfLgpd,
} from '../services/paciente-exportar-historico.service.js';
import { PacienteController } from '../controllers/paciente.controller.js';
import { PacienteModel, Paciente } from '../models/paciente.model.js';
import { HistoricoSessaoModel } from '../models/historico.model.js';
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';
import { supabase } from '../../../core/supabase/supabase.client.js';

describe('PacienteExportarHistoricoService & PacienteController (RF20, RN04, RN05, RNF06)', () => {
  const pacienteIdValido = '123e4567-e89b-12d3-a456-426614174000';
  const terapeutaIdValido = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const clinicaIdValida = '777e4567-e89b-12d3-a456-426614174777';

  const mockPacienteAtivo: Paciente = {
    id: pacienteIdValido,
    nome: 'Pedro Henrique Silveira',
    data_nascimento: '2018-06-15',
    cpf: '529.982.247-25',
    telefone: '(11) 98765-4321',
    status_ativo: true,
    created_at: '2026-01-10T10:00:00.000Z',
    updated_at: '2026-01-10T10:00:00.000Z',
    clinica_id: clinicaIdValida,
    cep: '01310-100',
    cidade: 'São Paulo',
    estado: 'SP',
    endereco: 'Av. Paulista',
    bairro: 'Bela Vista',
    numero: '1000',
    complemento: null,
    terapeutas: [{ id: terapeutaIdValido, nome: 'Dra. Mariana Costa' }],
  };

  const mockUsuarioTerapeuta: UsuarioAutenticado = {
    id: terapeutaIdValido,
    email: 'terapeuta@intea.com.br',
    clinica_id: clinicaIdValida,
    user_metadata: { is_super_admin: false, nome: 'Dra. Mariana Costa' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function criarMockResponse() {
    const res: Partial<Response> = {};
    const headers: Record<string, string> = {};
    res.statusCode = 200;

    res.status = vi.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res as Response;
    });

    res.json = vi.fn().mockImplementation((_data: unknown) => {
      return res as Response;
    });

    res.send = vi.fn().mockImplementation((_body: unknown) => {
      return res as Response;
    });

    res.setHeader = vi.fn().mockImplementation((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return res as Response;
    });

    res.getHeader = vi.fn().mockImplementation((name: string) => {
      return headers[name.toLowerCase()];
    });

    return res as Response & { statusCode: number; headers: Record<string, string> };
  }

  describe('Mascaramento de CPF (LGPD / RNF06)', () => {
    it('deve mascarar corretamente o CPF no formato ***.XXX.***-XX', () => {
      expect(mascararCpfLgpd('529.982.247-25')).toBe('***.982.***-25');
      expect(mascararCpfLgpd('12345678901')).toBe('***.456.***-01');
      expect(mascararCpfLgpd(null)).toBe('***.***.***-**');
      expect(mascararCpfLgpd('')).toBe('***.***.***-**');
      expect(mascararCpfLgpd('123')).toBe('***.***.***-**');
    });
  });

  describe('Validações de Entrada e Autenticação (400 e 401)', () => {
    it('deve retornar 400 Bad Request se o ID fornecido não for um UUID válido', async () => {
      const res = criarMockResponse();
      const req = {
        params: { id: 'uuid-invalido-123' },
        user: mockUsuarioTerapeuta,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('UUID') })
      );
    });

    it('deve retornar 401 Unauthorized se o usuário não estiver autenticado', async () => {
      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: undefined,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Acesso não autorizado') })
      );
    });
  });

  describe('Validações de Vínculo e Soft Delete (RN04 e RN05)', () => {
    it('deve retornar 404 Not Found se o paciente não existir no cadastro', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(null);

      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: mockUsuarioTerapeuta,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('não encontrado') })
      );
    });

    it('deve retornar 404 Not Found se o paciente estiver inativo (soft delete RN05)', async () => {
      const pacienteInativo: Paciente = {
        ...mockPacienteAtivo,
        status_ativo: false,
      };
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteInativo);

      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: mockUsuarioTerapeuta,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('soft delete') })
      );
    });

    it('deve retornar 403 Forbidden se o terapeuta não possuir vínculo ativo com o paciente (RN04)', async () => {
      const pacienteSemVinculo: Paciente = {
        ...mockPacienteAtivo,
        terapeutas: [{ id: 'outro-terapeuta-id', nome: 'Dr. Outro' }],
      };
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteSemVinculo);

      // Simula ausência de vínculo na tabela terapeuta_paciente
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      } as any);

      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: mockUsuarioTerapeuta,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('vínculo clínico ativo') })
      );
    });

    it('deve permitir acesso para Super Administrador mesmo sem vínculo específico no cadastro', async () => {
      const pacienteSemVinculo: Paciente = {
        ...mockPacienteAtivo,
        terapeutas: [],
      };
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(pacienteSemVinculo);
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue({
        total_sessoes: 5,
        total_iniciadas: 5,
        sessoes_finalizadas: 5,
        sessoes_interrompidas: 0,
        taxa_conclusao_porcentagem: 100,
        taxa_conclusao: 100,
        tempo_total_segundos: 3000,
        tempo_medio_segundos: 600,
      });
      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([]);

      const usuarioSuperAdmin: UsuarioAutenticado = {
        id: 'super-admin-id',
        email: 'admin@intea.com.br',
        is_super_admin: true,
        user_metadata: { is_super_admin: true },
      };

      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: usuarioSuperAdmin,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });
  });

  describe('Geração com Sucesso e Empty State (RF20)', () => {
    it('deve gerar PDF com status 200 e cabeçalhos corretos para paciente com histórico clínico', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(mockPacienteAtivo);
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue({
        total_sessoes: 10,
        total_iniciadas: 10,
        sessoes_finalizadas: 8,
        sessoes_interrompidas: 2,
        taxa_conclusao_porcentagem: 80,
        taxa_conclusao: 80,
        tempo_total_segundos: 4800,
        tempo_medio_segundos: 600,
      });
      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([
        {
          jogo_id: 'jogo-1',
          nome: 'Jornada Sensorial',
          versao: '1.0.0',
          total_sessoes: 6,
          ultima_sessao: '2026-10-18T14:00:00Z',
        },
      ]);

      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: mockUsuarioTerapeuta,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="prontuario-longitudinal-${pacienteIdValido}.pdf"`
      );

      expect(res.send).toHaveBeenCalledTimes(1);
      const buffer = (res.send as any).mock.calls[0][0];
      expect(buffer).toBeInstanceOf(Buffer);
      // Valida cabeçalho mágico de PDF
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('deve tratar graciosamente Empty State (paciente sem sessões) retornando 200 sem erro 500', async () => {
      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValue(mockPacienteAtivo);
      vi.spyOn(HistoricoSessaoModel, 'buscarMetricasEngajamentoGeral').mockResolvedValue({
        total_sessoes: 0,
        total_iniciadas: 0,
        sessoes_finalizadas: 0,
        sessoes_interrompidas: 0,
        taxa_conclusao_porcentagem: 0,
        taxa_conclusao: 0,
        tempo_total_segundos: 0,
        tempo_medio_segundos: 0,
      });
      vi.spyOn(HistoricoSessaoModel, 'listarJogosDoPaciente').mockResolvedValue([]);

      const res = criarMockResponse();
      const req = {
        params: { id: pacienteIdValido },
        user: mockUsuarioTerapeuta,
      } as unknown as Request;

      await PacienteController.exportarProntuario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');

      const buffer = (res.send as any).mock.calls[0][0];
      expect(buffer).toBeInstanceOf(Buffer);
      const conteudoPdf = buffer.toString('latin1');
      expect(conteudoPdf).toContain('Nenhuma intervencao clinica realizada ate o momento');
    });
  });
});
