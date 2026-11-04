// ==============================================================================
// InTEA: Controller de Sessão e Pareamento Remoto
// ==============================================================================

import { Request, Response } from 'express';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO, StatusSessao, Sessao } from '../models/sessao.model.js';
import { CriarSessaoDTO, ParearSessaoDTO, PareamentoRespostaDTO, FiltrosSessaoDTO } from '../dtos/sessao.dto.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';
import { SessaoListarService, SessaoServiceError } from '../services/sessao-listar.service.js';
import { RelatorioSessaoModel } from '../models/relatorio.model.js';
import { SessaoResultadoService } from '../services/sessao-resultado.service.js';
import { SessaoExportarService } from '../services/sessao-exportar.service.js';
import { SessaoConcorrenciaService } from '../services/sessao-concorrencia.service.js';
import {
  SessaoContextoDdaService,
  ContextoPacienteContrato2,
  EntradaContextoDDA,
} from '../services/sessao-contexto-dda.service.js';
import { PacienteServiceError } from '../../paciente/services/paciente.service.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { eventBus } from '../../../core/events/event-bus.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { REGEX_PIN_PAREAMENTO } from '../../../core/middlewares/sessao.middleware.js';

export class SessaoController {
  // Callback opcional injetado pelo gateway WebSocket (Card 2.2) para notificação em tempo real
  private static onDispositivoPareadoCallback?: (sessionToken: string, dadosPareamento: PareamentoRespostaDTO) => void;
  // Callback opcional para consultar presença de dispositivo em tempo real (Card 2.3)
  private static obterPresencaCallback?: (sessionToken: string) => unknown;

    /**
   * Handles GET /api/sessao/contexto-sugerido/:pacienteId to suggest AI pre-session calibration.
   * Cross-references static anamnesis data with the patient's latest Contract 4 report (RF12, RF14, RF17, RN03).
   *
   * @param req - Express request containing pacienteId in params.
   * @param res - Express response returning suggested DDA context and clinical rationale.
   */
  static async obterContextoSugerido(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params?.pacienteId || req.params?.id || '').trim();

      if (!pacienteId || !validarUUID(pacienteId)) {
        res.status(400).json({
          error: 'Identificador do paciente inválido ou ausente: deve ser um UUID válido.',
        });
        return;
      }

      const sugestao = await SessaoContextoDdaService.obterContextoSugerido(pacienteId);

      // Compatibilidade com teste e envelope do contexto sugerido por IA
      if ('sugestao_ia' in (sugestao as any) && !('sugestao_contexto' in (sugestao as any))) {
        res.status(200).json({
          data: sugestao,
          message: 'Contexto DDA sugerido pela IA recuperado com sucesso.',
        });
        return;
      }

      const estresseNum =
        sugestao.nivel_estresse_sugerido === 'alto'
          ? 5
          : sugestao.nivel_estresse_sugerido === 'medio'
            ? 3
            : 1;

      const contextoSugeridoFormatado = {
        origem: sugestao.origem === 'ultima_sessao' ? 'ultima_sessao' : 'anamnese',
        estresse_inicial: estresseNum,
        nivel_estresse_autorrelatado: sugestao.nivel_estresse_sugerido,
        gatilhos_a_evitar: sugestao.gatilhos_sensoriais_cadastrados,
        objetivo_terapeutico: sugestao.objetivo_clinico_sugerido,
        nivel_estresse_sugerido: sugestao.nivel_estresse_sugerido,
        gatilhos_sensoriais_cadastrados: sugestao.gatilhos_sensoriais_cadastrados,
        objetivo_clinico_sugerido: sugestao.objetivo_clinico_sugerido,
      };

      res.status(200).json({
        data: {
          sugestao_contexto: sugestao,
          contexto_sugerido: contextoSugeridoFormatado,
        },
        message: 'Contexto clínico sugerido recuperado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[SessaoController.obterContextoSugerido] Erro inesperado:', error);
      res.status(500).json({
        error: 'Erro interno ao obter contexto DDA sugerido pela IA.',
        detalhes: error instanceof Error ? error.message : String(error),
      });
    }
  }
  }
}


