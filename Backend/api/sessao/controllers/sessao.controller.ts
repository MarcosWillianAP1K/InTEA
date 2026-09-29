import { Request, Response } from 'express';
import { SessaoModel } from '../models/sessao.model.js';
import { ParearSessaoDTO, PareamentoRespostaDTO } from '../dtos/sessao.dto.js';

export class SessaoController {
  // Callback opcional injetado pelo gateway WebSocket (Card 2.2) para notificação em tempo real
  private static onDispositivoPareadoCallback?: (sessionToken: string, dadosPareamento: PareamentoRespostaDTO) => void;

  /**
   * Permite que o WebSocket Gateway registre um listener para notificações reativas.
   */
  static registrarListenerPareamento(
    callback: (sessionToken: string, dadosPareamento: PareamentoRespostaDTO) => void
  ): void {
    SessaoController.onDispositivoPareadoCallback = callback;
  }

  /**
   * Handles POST /api/sessao/parear to perform remote pairing handshake between external game and therapist web panel (RF10).
   *
   * @param req - Express request containing session_token and optional device metadata in body.
   * @param res - Express response returning pairing confirmation, game context, and WebSocket credentials.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async parear(req: Request, res: Response): Promise<void> {
    try {
      const { session_token, dispositivo_info }: ParearSessaoDTO = req.body || {};

      // 1. Validação de presença e tipo do session_token
      if (!session_token || typeof session_token !== 'string' || session_token.trim().length === 0) {
        res.status(400).json({
          error: 'Parâmetro obrigatório ausente ou inválido: session_token',
          detalhes: 'Informe o código PIN de pareamento exibido no painel do terapeuta.'
        });
        return;
      }

      // 2. Busca a sessão correspondente ao token
      const sessao = await SessaoModel.buscarPorToken(session_token);

      if (!sessao) {
        res.status(404).json({
          error: 'Sessão não encontrada para o token informado',
          detalhes: 'Verifique se o PIN foi digitado corretamente ou solicite um novo código.'
        });
        return;
      }

      // 3. Validação de estado atual da sessão
      if (sessao.status_sessao === 'em_andamento') {
        res.status(409).json({
          error: 'Sessão já pareada ou em andamento',
          detalhes: 'Esta sessão já foi iniciada por outro dispositivo.'
        });
        return;
      }

      if (sessao.status_sessao === 'finalizada') {
        res.status(410).json({
          error: 'Sessão já finalizada',
          detalhes: 'Esta intervenção clínica já foi encerrada.'
        });
        return;
      }

      if (sessao.status_sessao === 'cancelada') {
        res.status(410).json({
          error: 'Sessão cancelada',
          detalhes: 'Esta sessão foi cancelada previamente no painel do terapeuta.'
        });
        return;
      }

      // 4. Validação de expiração temporal do token (RNF03)
      if (sessao.expira_em) {
        const agora = Date.now();
        const dataExpiracao = new Date(sessao.expira_em).getTime();

        if (agora > dataExpiracao) {
          res.status(410).json({
            error: 'Token de pareamento expirado',
            detalhes: 'O tempo limite de 15 minutos para pareamento foi ultrapassado. Solicite ao terapeuta a emissão de um novo código.',
            expirado_em: sessao.expira_em
          });
          return;
        }
      }

      // 5. Efetivação do pareamento
      const sessaoAtualizada = await SessaoModel.parearDispositivo(sessao.id, dispositivo_info);

      const porta = process.env.PORT || 3000;
      const wsUrl = process.env.WS_URL || `ws://localhost:${porta}/sessao`;

      const resposta: PareamentoRespostaDTO = {
        sessao_id: sessaoAtualizada.id,
        session_token: sessaoAtualizada.session_token,
        status_sessao: sessaoAtualizada.status_sessao,
        modo_sessao: sessaoAtualizada.modo_sessao,
        jogo: {
          id: sessaoAtualizada.jogo?.id || sessaoAtualizada.jogo_id,
          nome: sessaoAtualizada.jogo?.nome || 'Jogo Terapêutico',
          versao: sessaoAtualizada.jogo?.versao || '1.0.0'
        },
        contexto_dda: sessaoAtualizada.contexto_dda_json || {},
        websocket: {
          url: wsUrl,
          canal: `session_${sessaoAtualizada.session_token}`
        },
        pareado_em: sessaoAtualizada.data_hora_inicio
      };

      // 6. Notificação reativa via WebSocket (Card 2.2)
      if (SessaoController.onDispositivoPareadoCallback) {
        try {
          SessaoController.onDispositivoPareadoCallback(sessaoAtualizada.session_token, resposta);
        } catch (wsError) {
          console.error('[SessaoController] Falha ao disparar evento WebSocket:', wsError);
        }
      }

      res.status(200).json({
        message: 'Dispositivo pareado com sucesso',
        data: resposta
      });
    } catch (error) {
      console.error('[SessaoController] Erro no handshake de pareamento:', error);
      res.status(500).json({
        error: 'Erro interno ao realizar pareamento de sessão',
        detalhes: error instanceof Error ? error.message : 'Falha inesperada'
      });
    }
  }

  /**
   * Handles GET /api/sessao/:token/status to check session status from therapist or game poll (RF10).
   *
   * @param req - Express request containing the session token in URL params.
   * @param res - Express response returning current session status and metadata.
   */
  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const token = String(req.params.token || '');
      if (!token) {
        res.status(400).json({ error: 'Token não fornecido' });
        return;
      }

      const sessao = await SessaoModel.buscarPorToken(token);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }

      res.status(200).json({
        data: {
          id: sessao.id,
          session_token: sessao.session_token,
          status_sessao: sessao.status_sessao,
          modo_sessao: sessao.modo_sessao,
          dispositivo_info: sessao.dispositivo_info,
          expira_em: sessao.expira_em,
          data_hora_inicio: sessao.data_hora_inicio
        }
      });
    } catch (error) {
      console.error('[SessaoController] Erro ao consultar status da sessão:', error);
      res.status(500).json({ error: 'Erro ao consultar status da sessão' });
    }
  }
}
