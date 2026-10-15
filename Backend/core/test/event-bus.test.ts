import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../events/event-bus.js';
import { inicializarAuditoriaListeners } from '../../api/auditoria/listeners/auditoria.listener.js';
import { AuditoriaService } from '../../api/auditoria/services/auditoria.service.js';
import { Sessao, STATUS_SESSAO, MODO_SESSAO } from '../../api/sessao/models/sessao.model.js';

describe('InTea EventBus & AuditoriaListener (Domain Events)', () => {
  const sessaoMock: Sessao = {
    id: '11111111-2222-3333-4444-555555555555',
    terapeuta_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    paciente_id: '99999999-8888-7777-6666-555555555555',
    jogo_id: '22222222-3333-4444-5555-666666666666',
    session_token: 'TEST-1234',
    modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
    contexto_dda_json: {},
    status_sessao: STATUS_SESSAO.FINALIZADA,
    data_hora_inicio: new Date().toISOString(),
    data_hora_fim: new Date().toISOString(),
    expira_em: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    inicializarAuditoriaListeners();
  });

  it('deve emitir e receber eventos customizados com dados corretos no barramento', () => {
    let eventoRecebido = false;
    const ouvinte = (dados: any) => {
      eventoRecebido = true;
      expect(dados.sessao.id).toBe(sessaoMock.id);
    };

    eventBus.ouvir('sessao:finalizada', ouvinte);

    eventBus.emitir('sessao:finalizada', {
      sessao: sessaoMock,
      terapeutaId: sessaoMock.terapeuta_id,
      ip: '127.0.0.1',
      userAgent: 'VitestAgent/1.0',
      temAnotacoes: false,
    });

    expect(eventoRecebido).toBe(true);
    eventBus.removerOuvinte('sessao:finalizada', ouvinte);
  });

  it('deve acionar AuditoriaService.registrarSilencioso ao emitir sessao:finalizada', async () => {
    const spyAuditoria = vi.spyOn(AuditoriaService, 'registrarSilencioso').mockResolvedValue(undefined);

    eventBus.emitir('sessao:finalizada', {
      sessao: sessaoMock,
      terapeutaId: sessaoMock.terapeuta_id,
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test',
      temAnotacoes: true,
    });

    expect(spyAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        sessao_id: sessaoMock.id,
        terapeuta_id: sessaoMock.terapeuta_id,
        acao: 'sessao_finalizada',
        origem: 'terapeuta_web',
        ip: '192.168.1.100',
        user_agent: 'Mozilla/5.0 Test',
        detalhes_json: expect.objectContaining({
          modo_sessao: MODO_SESSAO.SESSAO_CLINICA,
          tem_anotacoes: true,
          gerou_relatorio_ia: true,
        }),
      })
    );
  });

  it('deve acionar AuditoriaService.registrarSilencioso ao emitir sessao:cancelada', async () => {
    const spyAuditoria = vi.spyOn(AuditoriaService, 'registrarSilencioso').mockResolvedValue(undefined);

    const sessaoCanceladaMock: Sessao = {
      ...sessaoMock,
      status_sessao: STATUS_SESSAO.CANCELADA,
    };

    eventBus.emitir('sessao:cancelada', {
      sessao: sessaoCanceladaMock,
      terapeutaId: sessaoCanceladaMock.terapeuta_id,
      statusAnterior: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
      ip: '10.0.0.1',
      userAgent: 'TestBrowser',
    });

    expect(spyAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        sessao_id: sessaoCanceladaMock.id,
        acao: 'sessao_cancelada',
        origem: 'terapeuta_web',
        detalhes_json: expect.objectContaining({
          status_anterior: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
        }),
      })
    );
  });

  it('deve acionar AuditoriaService.registrarSilencioso ao emitir sessao:pareada', async () => {
    const spyAuditoria = vi.spyOn(AuditoriaService, 'registrarSilencioso').mockResolvedValue(undefined);

    const sessaoPareadaMock: Sessao = {
      ...sessaoMock,
      status_sessao: STATUS_SESSAO.CONECTADO,
      dispositivo_info: { modelo: 'Tablet Galaxy Tab A9', tipo_dispositivo: 'tablet' },
    };

    eventBus.emitir('sessao:pareada', {
      sessao: sessaoPareadaMock,
      terapeutaId: sessaoPareadaMock.terapeuta_id,
      ip: '192.168.0.50',
      userAgent: 'InTEAGameClient/2.0',
    });

    expect(spyAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        sessao_id: sessaoPareadaMock.id,
        acao: 'dispositivo_pareado',
        origem: 'dispositivo_jogo',
        detalhes_json: expect.objectContaining({
          jogo_id: sessaoPareadaMock.jogo_id,
          dispositivo_info: expect.objectContaining({ modelo: 'Tablet Galaxy Tab A9' }),
        }),
      })
    );
  });
});
