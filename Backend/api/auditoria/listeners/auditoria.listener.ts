// ==============================================================================
// InTEA: Ouvintes de Eventos de Domínio para Trilha Unificada de Auditoria
// ==============================================================================
// Escuta eventos emitidos pelo barramento central (EventBus) e persiste logs
// imutáveis em `public.auditoria_evento` sem acoplamento direto com os controllers.
// ==============================================================================

import { eventBus } from '../../../core/events/event-bus.js';
import { AuditoriaService } from '../services/auditoria.service.js';
import { MODO_SESSAO } from '../../sessao/models/sessao.model.js';

let ouvintesRegistrados = false;

/**
 * Initializes domain event listeners for the entire ecosystem lifecycle,
 * recording immutable audit logs without blocking callers.
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
        entidade: 'sessao',
        sessao_id: dados.sessao.id,
        terapeuta_id: dados.terapeutaId,
        paciente_id: dados.sessao.paciente_id || null,
        recurso_id: dados.sessao.id,
        origem: 'terapeuta_web',
        acao: 'sessao_finalizada',
        descricao: 'Sessão clínica finalizada e estado persistido no prontuário.',
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
        entidade: 'sessao',
        sessao_id: dados.sessao.id,
        terapeuta_id: dados.terapeutaId,
        paciente_id: dados.sessao.paciente_id || null,
        recurso_id: dados.sessao.id,
        origem: 'terapeuta_web',
        acao: 'sessao_cancelada',
        descricao: 'Sessão clínica cancelada antes da conclusão.',
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
        entidade: 'sessao',
        sessao_id: dados.sessao.id,
        terapeuta_id: dados.terapeutaId,
        paciente_id: dados.sessao.paciente_id || null,
        recurso_id: dados.sessao.id,
        origem: 'dispositivo_jogo',
        acao: 'dispositivo_pareado',
        descricao: 'Dispositivo externo pareado com a sessão terapêutica.',
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

  // 4. Escuta criação de vínculo de equipe multidisciplinar
  eventBus.ouvir('vinculo:criado', async (dados) => {
    try {
      await AuditoriaService.registrarVinculoSilencioso({
        paciente_id: dados.pacienteId,
        terapeuta_autor_id: dados.terapeutaAutorId,
        terapeuta_alvo_id: dados.terapeutaAlvoId,
        acao: 'vinculo_equipe_criado',
        ip: dados.ip,
        user_agent: dados.userAgent,
      });
    } catch (err) {
      console.error('[AuditoriaListener] Falha ao processar evento vinculo:criado:', err);
    }
  });

  // 5. Escuta remoção de vínculo de equipe multidisciplinar
  eventBus.ouvir('vinculo:removido', async (dados) => {
    try {
      await AuditoriaService.registrarVinculoSilencioso({
        paciente_id: dados.pacienteId,
        terapeuta_autor_id: dados.terapeutaAutorId,
        terapeuta_alvo_id: dados.terapeutaAlvoId,
        acao: 'vinculo_equipe_removido',
        ip: dados.ip,
        user_agent: dados.userAgent,
      });
    } catch (err) {
      console.error('[AuditoriaListener] Falha ao processar evento vinculo:removido:', err);
    }
  });

  // 6. Escuta eventos genéricos de auditoria do ecossistema completo
  eventBus.ouvir('auditoria:evento', async (dados) => {
    try {
      await AuditoriaService.registrarEventoUnificadoSilencioso({
        entidade: dados.entidade,
        acao: dados.acao,
        origem: dados.origem,
        terapeuta_id: dados.terapeutaId ?? null,
        paciente_id: dados.pacienteId ?? null,
        sessao_id: dados.sessaoId ?? null,
        clinica_id: dados.clinicaId ?? null,
        recurso_id: dados.recursoId ?? null,
        descricao: dados.descricao ?? null,
        detalhes_json: dados.detalhes ?? {},
        ip: dados.ip ?? null,
        user_agent: dados.userAgent ?? null,
      });
    } catch (err) {
      console.error('[AuditoriaListener] Falha ao processar evento auditoria:evento:', err);
    }
  });
}

// Auto-inicializa na carga do módulo para garantir escuta ativa
inicializarAuditoriaListeners();
