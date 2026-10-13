// ==============================================================================
// InTEA: Ouvintes de Eventos de Domínio para Trilha de Auditoria Clínica
// ==============================================================================
// Escuta eventos emitidos pelo barramento central (EventBus) e persiste logs
// imutáveis de auditoria forense sem acoplamento direto com os controllers.
// ==============================================================================

import { eventBus } from '../../../core/events/event-bus.js';
import { AuditoriaService } from '../services/auditoria.service.js';
import { MODO_SESSAO } from '../../sessao/models/sessao.model.js';

let ouvintesRegistrados = false;

/**
 * Inicializa a escuta de eventos do ciclo de vida da sessão para gravação
 * silenciosa e assíncrona na trilha de auditoria clínica (RF13, RNF06, RN05).
 */
export function inicializarAuditoriaListeners(): void {
  if (ouvintesRegistrados) {
    return;
  }
  ouvintesRegistrados = true;

  // 1. Escuta finalização de sessão clínica ou livre
  eventBus.ouvir('sessao:finalizada', async (dados) => {
    try {
      await AuditoriaService.registrarSilencioso({
        sessao_id: dados.sessao.id,
        terapeuta_id: dados.terapeutaId,
        origem: 'terapeuta_web',
        acao: 'sessao_finalizada',
        detalhes_json: {
          modo_sessao: dados.sessao.modo_sessao,
          data_hora_inicio: dados.sessao.data_hora_inicio,
          data_hora_fim: dados.sessao.data_hora_fim,
          gerou_relatorio_ia:
            dados.sessao.modo_sessao !== MODO_SESSAO.MODO_LIVRE &&
            Boolean(dados.sessao.paciente_id),
          tem_anotacoes: dados.temAnotacoes,
        },
        ip: dados.ip,
        user_agent: dados.userAgent,
      });
    } catch (err) {
      console.error('[AuditoriaListener] Falha ao processar evento sessao:finalizada:', err);
    }
  });

  // 2. Escuta cancelamento de sessão pendente
  eventBus.ouvir('sessao:cancelada', async (dados) => {
    try {
      await AuditoriaService.registrarSilencioso({
        sessao_id: dados.sessao.id,
        terapeuta_id: dados.terapeutaId,
        origem: 'terapeuta_web',
        acao: 'sessao_cancelada',
        detalhes_json: {
          status_anterior: dados.statusAnterior,
        },
        ip: dados.ip,
        user_agent: dados.userAgent,
      });
    } catch (err) {
      console.error('[AuditoriaListener] Falha ao processar evento sessao:cancelada:', err);
    }
  });

  // 3. Escuta pareamento de jogo externo com a sessão
  eventBus.ouvir('sessao:pareada', async (dados) => {
    try {
      await AuditoriaService.registrarSilencioso({
        sessao_id: dados.sessao.id,
        terapeuta_id: dados.terapeutaId,
        origem: 'dispositivo_jogo',
        acao: 'dispositivo_pareado',
        detalhes_json: {
          jogo_id: dados.sessao.jogo_id,
          dispositivo_info: dados.sessao.dispositivo_info || null,
          modo_sessao: dados.sessao.modo_sessao,
        },
        ip: dados.ip,
        user_agent: dados.userAgent,
      });
    } catch (err) {
      console.error('[AuditoriaListener] Falha ao processar evento sessao:pareada:', err);
    }
  });
}

// Auto-inicializa na carga do módulo para garantir escuta ativa
inicializarAuditoriaListeners();
