// ==============================================================================
// InTEA: Controller de Sessão e Pareamento Remoto
// ==============================================================================

import { Request, Response } from 'express';
import { SessaoModel, CriarSessaoDTO, STATUS_SESSAO, MODO_SESSAO } from '../models/sessao.model.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';

export class SessaoController {
  /**
   * Inicia uma nova sessão clínica ou em modo livre
   * POST /api/sessao/iniciar
   */
  static async iniciar(req: Request, res: Response): Promise<void> {
    try {
      const {
        terapeuta_id,
        jogo_id,
        paciente_id,
        modo_sessao = MODO_SESSAO.SESSAO_CLINICA,
        contexto_dda_json = {},
        codigo_pareamento,
      } = req.body;

      const codigoFinal = codigo_pareamento || req.body.codigo;

      if (!terapeuta_id || !jogo_id || !codigoFinal) {
        res.status(400).json({ error: 'Os campos terapeuta_id, jogo_id e codigo_pareamento são obrigatórios' });
        return;
      }

      if (modo_sessao && !Object.values(MODO_SESSAO).includes(modo_sessao)) {
        res.status(400).json({ error: 'Modo de sessão inválido. Escolha entre: ' + Object.values(MODO_SESSAO).join(', ') });
        return;
      }

      // Validação da regra RN01 (Modo Livre sem paciente / Sessão Clínica com paciente)
      if (modo_sessao === MODO_SESSAO.SESSAO_CLINICA && !paciente_id) {
        res.status(400).json({ error: 'O paciente_id é obrigatório para sessões clínicas (RN01)' });
        return;
      }

      if (modo_sessao === MODO_SESSAO.MODO_LIVRE && paciente_id) {
        res.status(400).json({ error: 'Partidas em modo livre não podem ter paciente vinculado (RN01)' });
        return;
      }

      const dadosSessao: CriarSessaoDTO = {
        terapeuta_id,
        jogo_id,
        paciente_id: modo_sessao === MODO_SESSAO.MODO_LIVRE ? null : paciente_id,
        modo_sessao,
        contexto_dda_json,
        codigo_pareamento: codigoFinal,
      };

      const novaSessao = await SessaoModel.criar(dadosSessao);

      if (!novaSessao) {
        res.status(500).json({ error: 'Erro ao criar a sessão no banco de dados' });
        return;
      }

      // Retorno explícito com os campos exigidos pelo Card 538 (critério de aceite)
      res.status(201).json({
        data: {
          session_id: novaSessao.id,
          session_token: novaSessao.session_token,
          status_sessao: novaSessao.status_sessao,
          modo_sessao: novaSessao.modo_sessao,
          paciente_id: novaSessao.paciente_id,
          expira_em: novaSessao.expira_em,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao iniciar sessão' });
    }
  }

  /**
   * Busca uma sessão pelo seu ID interno (UUID)
   * GET /api/sessao/:id
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const sessao = await SessaoModel.buscarPorId(id);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }
      res.json({ data: sessao });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao buscar sessão' });
    }
  }

  /**
   * Busca sessão pelo token de pareamento (utilizado pelo jogo externo)
   * GET /api/sessao/token/:token
   */
  static async buscarPorToken(req: Request, res: Response): Promise<void> {
    try {
      const token = String(req.params.token);
      const sessao = await SessaoModel.buscarPorToken(token);
      if (!sessao) {
        res.status(404).json({ error: 'Código de sessão inválido ou expirado' });
        return;
      }
      res.json({ data: sessao });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao buscar sessão por token' });
    }
  }

  /**
   * Finaliza uma sessão clínica
   * PATCH /api/sessao/:id/finalizar
   */
  static async finalizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const sessaoAtualizada = await SessaoModel.atualizarStatus(id, STATUS_SESSAO.FINALIZADA);
      if (!sessaoAtualizada) {
        res.status(404).json({ error: 'Sessão não encontrada para finalização' });
        return;
      }
      res.json({ data: sessaoAtualizada });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao finalizar sessão' });
    }
  }

  /**
   * Cancela antecipadamente uma sessão pendente (pelo terapeuta)
   * DELETE /api/sessao/:id/cancelar 
   */
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      const sessao = await SessaoModel.buscarPorId(id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }

      // Sessões já encerradas não podem ser canceladas novamente
      const statusNaoCancelaveis: string[] = [
        STATUS_SESSAO.FINALIZADA,
        STATUS_SESSAO.EXPIRADA,
        STATUS_SESSAO.CANCELADA,
      ];

      if (statusNaoCancelaveis.includes(sessao.status_sessao)) {
        res.status(400).json({
          error: `A sessão já está no status '${sessao.status_sessao}' e não pode ser cancelada.`,
        });
        return;
      }

      const sessaoCancelada = await SessaoModel.atualizarStatus(id, STATUS_SESSAO.CANCELADA);

      if (!sessaoCancelada) {
        res.status(500).json({ error: 'Erro ao cancelar a sessão no banco de dados' });
        return;
      }

      res.json({ data: sessaoCancelada });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao cancelar sessão' });
    }
  }

  /**
   * Handshake de pareamento remoto: jogo externo confirma conexão via session_token
   * POST /api/sessao/parear (Card 563)
   */
  static async parear(req: Request, res: Response): Promise<void> {
    try {
      const { session_token, jogo_id } = req.body;

      if (!session_token) {
        res.status(400).json({ error: 'O campo session_token é obrigatório' });
        return;
      }

      const sessao = await SessaoModel.buscarPorToken(session_token);

      if (!sessao) {
        res.status(404).json({ error: 'Token de sessão inválido ou não encontrado' });
        return;
      }

      // Verifica expiração pelo TTL de 15 minutos (retorno 410 Gone)
      if (new Date(sessao.expira_em) < new Date()) {
        res.status(410).json({
          error: 'Token de pareamento expirado. Solicite um novo código ao terapeuta.',
        });
        return;
      }

      // Verificação opcional de consistência de jogo:
      // se o launcher informar o próprio jogo_id, garante que é o mesmo selecionado pelo terapeuta
      if (jogo_id && jogo_id !== sessao.jogo_id) {
        res.status(409).json({
          error: 'O jogo informado não corresponde ao jogo selecionado pelo terapeuta para esta sessão.',
        });
        return;
      }

      // Apenas sessões em 'aguardando_pareamento' podem transicionar para 'conectado'
      if (sessao.status_sessao !== STATUS_SESSAO.AGUARDANDO_PAREAMENTO) {
        res.status(400).json({
          error: `Pareamento inválido: a sessão está no status '${sessao.status_sessao}'.`,
        });
        return;
      }

      // Transição atômica: aguardando_pareamento → conectado
      const sessaoPareada = await SessaoModel.atualizarStatus(sessao.id, STATUS_SESSAO.CONECTADO);

      if (!sessaoPareada) {
        res.status(500).json({ error: 'Erro ao registrar pareamento no banco de dados' });
        return;
      }

      // Retorna os parâmetros essenciais para o jogo externo
      res.status(200).json({
        data: {
          session_id: sessaoPareada.id,
          session_token: sessaoPareada.session_token,
          status_sessao: sessaoPareada.status_sessao,
          jogo_id: sessaoPareada.jogo_id,
          paciente_id: sessaoPareada.paciente_id,
          contexto_dda_json: sessaoPareada.contexto_dda_json,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao realizar pareamento' });
    }
  }

  /**
   * Gera um código de pareamento único para a sessão
   * GET /api/sessao/gerarCodigoPareamento
   */
  static async gerarCodigoPareamento(_req: Request, res: Response): Promise<void> {
    try {
      const maxTentativas = 10;
      let tentativasRestantes = maxTentativas;
      let codigo = SessaoTokenService.gerarCodigoPareamento();

      while (tentativasRestantes > 0) {
        const sessaoExistente = await SessaoModel.buscarPorToken(codigo);
        if (!sessaoExistente) {
          break;
        }
        tentativasRestantes--;
        codigo = SessaoTokenService.gerarCodigoPareamento();
      }

      if (tentativasRestantes === 0) {
        res.status(500).json({ error: `Não foi possível gerar um código de pareamento único após ${maxTentativas} tentativas` });
        return;
      }

      res.json({ codigo });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao gerar código de pareamento' });
    }
  }

  /**
   * Atualiza o status de uma sessão (máquina de estados genérica)
   * PATCH /api/sessao/:id/status
   */
  static async atualizarStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: 'O campo status é obrigatório' });
        return;
      }

      if (!Object.values(STATUS_SESSAO).includes(status)) {
        res.status(400).json({ error: 'O status informado é inválido, deve conter algum desses valores: ' + Object.values(STATUS_SESSAO).join(', ') });
        return;
      }

      const sessaoAtualizada = await SessaoModel.atualizarStatus(id, status);

      if (!sessaoAtualizada) {
        res.status(404).json({ error: 'Sessão não encontrada para atualização de status' });
        return;
      }

      res.status(200).json({ data: sessaoAtualizada });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao atualizar status da sessão' });
    }
  }
}