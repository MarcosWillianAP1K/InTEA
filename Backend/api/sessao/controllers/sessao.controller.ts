// ==============================================================================
// InTEA: Controller de Sessão e Pareamento Remoto
// ==============================================================================

import { Request, Response } from 'express';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO, StatusSessao, Sessao } from '../models/sessao.model.js';
import { CriarSessaoDTO, ParearSessaoDTO, PareamentoRespostaDTO, FiltrosSessaoDTO } from '../dtos/sessao.dto.js';
import { SessaoTokenService } from '../services/sessao-token.service.js';
import { SessaoListarService } from '../services/sessao-listar.service.js';
import { RelatorioSessaoModel } from '../models/relatorio.model.js';
import { SessaoResultadoService } from '../services/sessao-resultado.service.js';
import { SessaoExportarService } from '../services/sessao-exportar.service.js';
import { SessaoConcorrenciaService } from '../services/sessao-concorrencia.service.js';
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
   * Registers a callback listener for reactive WebSocket pairing notifications.
   *
   * @param callback - Callback invoked when a remote device pairs with a session.
   */
  static registrarListenerPareamento(
    callback: (sessionToken: string, dadosPareamento: PareamentoRespostaDTO) => void
  ): void {
    SessaoController.onDispositivoPareadoCallback = callback;
  }

  /**
   * Registers a callback to check real-time device presence via WebSocket.
   *
   * @param callback - Function returning presence data for a given session token.
   */
  static registrarCallbackPresenca(
    callback: (sessionToken: string) => unknown
  ): void {
    SessaoController.obterPresencaCallback = callback;
  }

  /**
   * Handles GET /api/sessao to list sessions with optional filters and pagination.
   * Restricts to the authenticated therapist's sessions, unless is_super_admin requests with all=true.
   *
   * @param req - Express request with query params (status, data, dataInicio, dataFim, pacienteId, jogoId, modo, page, limit, all).
   * @param res - Express response returning sessions array and pagination metadata.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query || {}) as Record<string, unknown>;
      const verTodasSessoes = query.all === 'true';
      const usuarioLogado = (req as AuthenticatedRequest).user;

      const pageParsed = query.page !== undefined ? Number(query.page) : undefined;
      const limitParsed = query.limit !== undefined ? Number(query.limit) : undefined;

      const filtros: FiltrosSessaoDTO = {
        status: typeof query.status === 'string' ? query.status : undefined,
        data: typeof query.data === 'string' ? query.data : undefined,
        dataInicio: typeof query.dataInicio === 'string' ? query.dataInicio : undefined,
        dataFim: typeof query.dataFim === 'string' ? query.dataFim : undefined,
        pacienteId: typeof query.pacienteId === 'string' ? query.pacienteId : undefined,
        jogoId: typeof query.jogoId === 'string' ? query.jogoId : undefined,
        modo: typeof query.modo === 'string' ? query.modo : undefined,
        page: Number.isFinite(pageParsed) && (pageParsed as number) > 0 ? Math.floor(pageParsed as number) : undefined,
        limit: Number.isFinite(limitParsed) && (limitParsed as number) > 0 ? Math.min(100, Math.floor(limitParsed as number)) : undefined,
      };

      const resultado = await SessaoListarService.listar(filtros, usuarioLogado, verTodasSessoes);

      res.status(200).json({
        data: {
          sessoes: resultado.data,
          meta: resultado.meta,
        },
        message: 'Sessões listadas com sucesso.',
      });
    } catch (error: unknown) {
      console.error('[SessaoController.listar]', error);
      res.status(500).json({
        error: 'Erro interno ao listar sessões.',
        detalhes: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handles POST /api/sessao/iniciar to start a new clinical or free-mode session.
   *
   * @param req - Express request containing session parameters (game ID, pairing code, patient ID, mode).
   * @param res - Express response returning the newly initialized session.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async iniciar(req: Request, res: Response): Promise<void> {
    try {
      // 1. Extração segura da identidade do terapeuta a partir do token JWT verificado (RF21, CA-1)
      const authReq = req as AuthenticatedRequest;
      const usuarioLogadoId = authReq.user?.id;

      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const {
        terapeuta_id: terapeutaIdBody,
        jogo_id,
        paciente_id,
        modo_sessao = MODO_SESSAO.SESSAO_CLINICA,
        contexto_dda_json = {},
        codigo_pareamento,
        dispositivo_info,
        status_sessao,
      } = req.body || {};

      // 2. Guarda Anti-Spoofing: bloqueia com 403 se o body informar terapeuta divergente do token (CA-3)
      if (terapeutaIdBody && terapeutaIdBody !== usuarioLogadoId) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de iniciar sessão para outro terapeuta não autorizada.',
        });
        return;
      }

      const codigoFinal = codigo_pareamento || req.body?.codigo;

      // 3. Validação de campos obrigatórios (terapeuta_id não é mais exigido no body)
      if (!jogo_id || !codigoFinal) {
        res.status(400).json({ error: 'Os campos jogo_id e codigo_pareamento são obrigatórios' });
        return;
      }

      // Validação estrita de UUIDs para evitar Postgres 22P02 e HTTP 500
      if (!validarUUID(jogo_id)) {
        res.status(400).json({ error: 'Identificador jogo_id inválido: deve ser um UUID válido.' });
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

      if (paciente_id && !validarUUID(paciente_id)) {
        res.status(400).json({ error: 'Identificador paciente_id inválido: deve ser um UUID válido.' });
        return;
      }

      // 4. Verificação de concorrência de sessão clínica simultânea (Sprint 13 — RF13, RF18, RN01, RN04)
      if (modo_sessao === MODO_SESSAO.SESSAO_CLINICA && paciente_id) {
        const resultadoConcorrencia = await SessaoConcorrenciaService.verificarSessaoAtivaConcorrente(
          paciente_id,
          usuarioLogadoId
        );

        if (resultadoConcorrencia.conflito) {
          res.status(409).json({
            error: resultadoConcorrencia.mensagem || 'O paciente já possui uma sessão clínica ativa no momento.',
            codigo: resultadoConcorrencia.codigo || 'SESSAO_CLINICA_SIMULTANEA_CONFLITO',
            detalhes: 'Não é permitido iniciar múltiplas sessões clínicas simultâneas para o mesmo paciente.',
            data: {
              conflito: true,
              sessao_ativa: resultadoConcorrencia.sessaoAtiva,
            },
          });
          return;
        }
      }

      const dadosSessao: CriarSessaoDTO = {
        terapeuta_id: usuarioLogadoId,
        jogo_id,
        paciente_id: modo_sessao === MODO_SESSAO.MODO_LIVRE ? null : paciente_id,
        modo_sessao,
        contexto_dda_json,
        codigo_pareamento: codigoFinal,
        dispositivo_info: dispositivo_info || null,
        status_sessao: status_sessao && Object.values(STATUS_SESSAO).includes(status_sessao)
          ? status_sessao
          : (dispositivo_info ? STATUS_SESSAO.EM_ANDAMENTO : STATUS_SESSAO.AGUARDANDO_PAREAMENTO),
      };

      const novaSessao = await SessaoModel.criar(dadosSessao);

      if (!novaSessao) {
        res.status(500).json({ error: 'Erro ao criar a sessão no banco de dados' });
        return;
      }

      res.status(201).json({
        data: {
          sessao: {
            id: novaSessao.id,
            status_sessao: novaSessao.status_sessao,
            modo_sessao: novaSessao.modo_sessao,
            paciente_id: novaSessao.paciente_id,
            terapeuta_id: novaSessao.terapeuta_id,
            jogo_id: novaSessao.jogo_id,
            data_hora_inicio: novaSessao.data_hora_inicio,
            contexto_dda_json: novaSessao.contexto_dda_json,
          },
          token_pareamento: {
            token: novaSessao.session_token,
            codigo: novaSessao.session_token,
            expira_em: novaSessao.expira_em,
          },
        },
        message: 'Sessão iniciada com sucesso.',
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao iniciar sessão' });
    }
  }

  /**
   * Handles GET /api/sessao/:id to retrieve a session by its internal UUID.
   *
   * @param req - Express request containing session UUID in URL parameter `:id`.
   * @param res - Express response returning the session details or 404 if not found.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = String(req.params.id);
      const sessao = authReq.contextoSessao || await SessaoModel.buscarPorId(id);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }
      res.status(200).json({
        data: {
          sessao,
        },
        message: 'Sessão localizada com sucesso.',
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao buscar sessão' });
    }
  }

  /**
   * Handles GET /api/sessao/buscarPorToken/:token to retrieve a session by its pairing token.
   *
   * @param req - Express request containing pairing token in URL parameter `:token`.
   * @param res - Express response returning the session record or 404 if not found or expired.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async buscarPorToken(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const token = String(req.params.token);
      const sessao = authReq.contextoSessao || await SessaoModel.buscarPorToken(token);
      if (!sessao) {
        res.status(404).json({ error: 'Código de sessão inválido ou expirado' });
        return;
      }
      res.status(200).json({
        data: {
          sessao,
        },
        message: 'Sessão localizada com sucesso.',
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao buscar sessão por token' });
    }
  }

  /**
   * Handles PATCH /api/sessao/:id/finalizar to finalize an active clinical or free-mode session.
   *
   * @param req - Express request containing session UUID or token in `:id` and final telemetry in body.
   * @param res - Express response returning the finalized session and report status.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async finalizar(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const idParam = String(req.params.id || '').trim();

      // 1. Busca prévia para validação estrita da máquina de estados (reusa contextoSessao com fallback)
      let sessaoAtual: Sessao | null = authReq.contextoSessao || null;
      if (!sessaoAtual) {
        if (validarUUID(idParam)) {
          sessaoAtual = await SessaoModel.buscarPorId(idParam);
        } else {
          // Valida se o identificador atende ao formato de token de pareamento (ex: 4M5S-8U7B ou 849-291)
          const isPossivelToken = /^[A-Z0-9]{3,5}-?[A-Z0-9]{3,5}$/i.test(idParam);
          if (!isPossivelToken) {
            res.status(400).json({ error: 'O identificador da sessão deve ser um UUID válido ou token existente.' });
            return;
          }

          sessaoAtual = await SessaoModel.buscarPorToken(idParam);
          if (!sessaoAtual) {
            res.status(400).json({ error: 'O identificador da sessão deve ser um UUID válido ou token existente.' });
            return;
          }
        }
      }

      if (!sessaoAtual) {
        res.status(404).json({ error: 'Sessão não encontrada para finalização' });
        return;
      }

      // Validação de autoria e permissão de mutação do condutor (Sprint 13 — RF21)
      const isSuperAdminFinalizar =
        authReq.user?.is_super_admin === true ||
        authReq.user?.user_metadata?.is_super_admin === true;

      const permissaoFinalizar = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(
        sessaoAtual,
        authReq.user?.id || '',
        isSuperAdminFinalizar
      );

      if (!permissaoFinalizar.permitido) {
        res.status(403).json({
          error: permissaoFinalizar.mensagem || 'Acesso negado: apenas o terapeuta condutor pode finalizar esta sessão.',
          codigo: permissaoFinalizar.codigo || 'FORBIDDEN_MUTACAO_CONDUTOR',
          detalhes: 'Especialistas vinculados acompanham a sessão como observadores e não possuem permissão de encerramento.',
        });
        return;
      }

      if (sessaoAtual.status_sessao === STATUS_SESSAO.FINALIZADA) {
        res.status(400).json({
          error: 'A sessão já se encontra finalizada.',
          detalhes: 'Esta intervenção clínica já foi encerrada e não pode ser finalizada novamente.',
        });
        return;
      }

      if (sessaoAtual.status_sessao === STATUS_SESSAO.CANCELADA) {
        res.status(400).json({
          error: 'A sessão foi cancelada e não pode ser finalizada.',
          detalhes: 'Sessões canceladas são estados terminais e não podem ser reabertas.',
        });
        return;
      }

      if (sessaoAtual.status_sessao === STATUS_SESSAO.EXPIRADA) {
        res.status(400).json({
          error: 'A sessão expirou e não pode ser finalizada.',
          detalhes: 'O tempo limite de pareamento foi ultrapassado.',
        });
        return;
      }

      if (sessaoAtual.status_sessao === STATUS_SESSAO.AGUARDANDO_PAREAMENTO) {
        res.status(400).json({
          error: 'A sessão ainda está aguardando pareamento e não foi iniciada.',
          detalhes: 'Para descartar uma sessão antes do pareamento, utilize o cancelamento (DELETE /api/sessao/:id/cancelar).',
        });
        return;
      }

      // 2. Atualização atômica da máquina de estados: 'finalizada' e carimbo de 'data_hora_fim'
      const sessaoAtualizada = await SessaoModel.finalizarSessao(sessaoAtual.id);
      if (!sessaoAtualizada) {
        res.status(500).json({ error: 'Erro ao registrar finalização da sessão no banco de dados' });
        return;
      }

      // Dispara evento de domínio desacoplado para auditoria e efeitos colaterais
      const ipOrigemFinalizar = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
      const usuarioLogadoFinalizar = (req as AuthenticatedRequest).user;
      const anotacoesRecebidas = req.body?.anotacoes_clinicas || req.body?.anotacoes || req.body?.observacoes;

      await eventBus.emitirAsync('sessao:finalizada', {
        sessao: sessaoAtualizada,
        terapeutaId: usuarioLogadoFinalizar?.id || sessaoAtualizada.terapeuta_id,
        ip: ipOrigemFinalizar,
        userAgent: (req.headers?.['user-agent'] as string) || null,
        temAnotacoes: Boolean(anotacoesRecebidas),
      });

      // 3. Conformidade com RN01 (Modo Livre sem Persistência Clínica / Sem IA)
      // Partidas em modo livre não gravam telemetria em prontuário, não acionam IA e paciente_id = NULL
      if (sessaoAtualizada.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessaoAtualizada.paciente_id) {
        res.status(200).json({
          data: {
            sessao: sessaoAtualizada,
            relatorio: null,
          },
          message: 'Sessão finalizada com sucesso.',
        });
        return;
      }

      // 3. Síntese do Relatório com o Motor de IA segundo o Contrato 4 (docs/ModelosDeContratos/relatorio.json)
      const relatorioIA = SessaoTokenService.gerarRelatorioIA(sessaoAtualizada);

      // Constrói o texto consolidado incluindo eventuais anotações do terapeuta
      const relatorioConteudo = relatorioIA
        ? (anotacoesRecebidas
            ? `${relatorioIA.analises_ia.join('\n')}\n\n[Observações do Terapeuta]: ${anotacoesRecebidas}`
            : relatorioIA.analises_ia.join('\n'))
        : (anotacoesRecebidas ? `[Observações do Terapeuta]: ${anotacoesRecebidas}` : '');

      // 4. Persistência do relatório no prontuário do paciente (tabela 'relatorio_sessao')
      if (relatorioIA) {
        try {
          await RelatorioSessaoModel.criar({
            sessao_id: sessaoAtualizada.id,
            conteudo: relatorioConteudo,
            dados_ia_json: relatorioIA,
          });
        } catch (errPersistencia) {
          console.error('[SessaoController] Falha ao persistir relatório na tabela relatorio_sessao:', errPersistencia);
        }
      }

      // 5. Retorna a sessão finalizada contendo o relatório da IA para exibição imediata no front
      res.status(200).json({
        data: {
          sessao: sessaoAtualizada,
          relatorio: relatorioIA || null,
        },
        message: 'Sessão finalizada com sucesso.',
      });
    } catch (error) {
      console.error('[SessaoController] Erro ao finalizar sessão:', error);
      res.status(500).json({ error: 'Erro interno ao finalizar sessão' });
    }
  }

  /**
   * Handles DELETE /api/sessao/:id/cancelar to cancel a pending session prematurely.
   *
   * @param req - Express request containing session UUID in URL parameter `:id`.
   * @param res - Express response returning the cancelled session record.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = String(req.params.id);

      const sessao = authReq.contextoSessao || await SessaoModel.buscarPorId(id);

      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }

      // Validação de autoria e permissão de mutação do condutor (Sprint 13 — RF21)
      const isSuperAdminCancelar =
        authReq.user?.is_super_admin === true ||
        authReq.user?.user_metadata?.is_super_admin === true;

      const permissaoCancelar = SessaoConcorrenciaService.validarPermissaoMutacaoSessao(
        sessao,
        authReq.user?.id || '',
        isSuperAdminCancelar
      );

      if (!permissaoCancelar.permitido) {
        res.status(403).json({
          error: permissaoCancelar.mensagem || 'Acesso negado: apenas o terapeuta condutor pode cancelar esta sessão.',
          codigo: permissaoCancelar.codigo || 'FORBIDDEN_MUTACAO_CONDUTOR',
          detalhes: 'Especialistas vinculados acompanham a sessão como observadores e não possuem permissão de cancelamento.',
        });
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

      // Dispara evento de domínio desacoplado para auditoria
      const ipOrigemCancelar = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
      const usuarioLogadoCancelar = (req as AuthenticatedRequest).user;

      await eventBus.emitirAsync('sessao:cancelada', {
        sessao: sessaoCancelada,
        terapeutaId: usuarioLogadoCancelar?.id || sessaoCancelada.terapeuta_id,
        statusAnterior: sessao.status_sessao,
        ip: ipOrigemCancelar,
        userAgent: (req.headers?.['user-agent'] as string) || null,
      });

      res.status(200).json({
        data: {
          sessao: sessaoCancelada,
        },
        message: 'Sessão cancelada com sucesso.',
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao cancelar sessão' });
    }
  }

  /**
   * Handles POST /api/sessao/parear for remote pairing handshake between external game and session.
   *
   * @param req - Express request containing pairing DTO (`session_token`, `jogo_id`, `dispositivo_info`).
   * @param res - Express response returning pairing confirmation and session context.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async parear(req: Request, res: Response): Promise<void> {
    try {
      const { session_token, jogo_id, dispositivo_info }: ParearSessaoDTO = req.body || {};

      // 1. Validação de presença e tipo do session_token
      if (!session_token || typeof session_token !== 'string' || session_token.trim().length === 0) {
        res.status(400).json({
          error: 'Parâmetro obrigatório ausente ou inválido: session_token',
          detalhes: 'Informe o código PIN de pareamento exibido no painel do terapeuta.',
        });
        return;
      }

      // 2. Busca a sessão correspondente ao token
      const sessao = await SessaoModel.buscarPorToken(session_token);

      if (!sessao) {
        res.status(404).json({
          error: 'Sessão não encontrada para o token informado',
          detalhes: 'Verifique se o PIN foi digitado corretamente ou solicite um novo código.',
        });
        return;
      }

      // 3. Validação de expiração pelo TTL de 15 minutos (Card 551 — retorno 410 Gone)
      if (sessao.expira_em) {
        const agora = Date.now();
        const dataExpiracao = new Date(sessao.expira_em).getTime();

        if (agora > dataExpiracao) {
          res.status(410).json({
            error: 'Token de pareamento expirado. Solicite um novo código ao terapeuta.',
            detalhes: 'O tempo limite de 15 minutos para pareamento foi ultrapassado. Solicite ao terapeuta a emissão de um novo código.',
            expirado_em: sessao.expira_em,
          });
          return;
        }
      }

      // 4. Verificação de consistência de jogo (se launcher informar jogo_id)
      if (jogo_id && jogo_id !== sessao.jogo_id) {
        res.status(409).json({
          error: 'O jogo informado não corresponde ao jogo selecionado pelo terapeuta para esta sessão.',
        });
        return;
      }

      // 5. Validação da máquina de estados:
      if (sessao.status_sessao === STATUS_SESSAO.EM_ANDAMENTO) {
        res.status(409).json({
          error: 'Sessão já pareada ou em andamento',
          detalhes: 'Esta sessão já foi iniciada por outro dispositivo.',
        });
        return;
      }

      if (sessao.status_sessao === STATUS_SESSAO.FINALIZADA) {
        res.status(410).json({
          error: 'Sessão já finalizada',
          detalhes: 'Esta intervenção clínica já foi encerrada.',
        });
        return;
      }

      if (sessao.status_sessao === STATUS_SESSAO.CANCELADA) {
        res.status(410).json({
          error: 'Sessão cancelada',
          detalhes: 'Esta sessão foi cancelada previamente no painel do terapeuta.',
        });
        return;
      }

      if (sessao.status_sessao !== STATUS_SESSAO.AGUARDANDO_PAREAMENTO) {
        res.status(400).json({
          error: `Pareamento inválido: a sessão está no status '${sessao.status_sessao}'.`,
        });
        return;
      }

      // 6. Efetivação do pareamento
      const sessaoAtualizada = await SessaoModel.parearDispositivo(sessao.id, dispositivo_info);

      if (!sessaoAtualizada) {
        res.status(500).json({ error: 'Erro ao registrar pareamento no banco de dados' });
        return;
      }

      const porta = process.env.PORT || 3000;
      const wsUrl = process.env.WS_URL || `ws://localhost:${porta}/sessao`;

      const respostaPayload: PareamentoRespostaDTO = {
        sessao_id: sessaoAtualizada.id,
        session_token: sessaoAtualizada.session_token,
        status_sessao: sessaoAtualizada.status_sessao,
        modo_sessao: sessaoAtualizada.modo_sessao,
        jogo: {
          id: sessaoAtualizada.jogo?.id || sessaoAtualizada.jogo_id,
          nome: sessaoAtualizada.jogo?.nome || 'Jogo Terapêutico',
          versao: sessaoAtualizada.jogo?.versao || '1.0.0',
        },
        jogo_id: sessaoAtualizada.jogo_id,
        paciente_id: sessaoAtualizada.paciente_id,
        contexto_dda: sessaoAtualizada.contexto_dda_json || {},
        websocket: {
          url: wsUrl,
          canal: `session_${sessaoAtualizada.session_token}`,
        },
        dispositivo_info: sessaoAtualizada.dispositivo_info || null,
        pareado_em: sessaoAtualizada.data_hora_inicio,
      };

      // Dispara listener reativo WebSocket (Card 2.2)
      if (SessaoController.onDispositivoPareadoCallback) {
        try {
          SessaoController.onDispositivoPareadoCallback(sessaoAtualizada.session_token, respostaPayload);
        } catch (wsError) {
          console.error('[SessaoController] Falha ao disparar evento WebSocket:', wsError);
        }
      }

      // Dispara evento de domínio desacoplado para auditoria
      const ipOrigemParear = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
      await eventBus.emitirAsync('sessao:pareada', {
        sessao: sessaoAtualizada,
        terapeutaId: sessaoAtualizada.terapeuta_id,
        ip: ipOrigemParear,
        userAgent: (req.headers?.['user-agent'] as string) || null,
      });

      res.status(200).json({
        data: {
          sessao: {
            id: sessaoAtualizada.id,
            session_token: sessaoAtualizada.session_token,
            status_sessao: sessaoAtualizada.status_sessao,
            modo_sessao: sessaoAtualizada.modo_sessao,
            jogo_id: sessaoAtualizada.jogo_id,
            paciente_id: sessaoAtualizada.paciente_id,
            terapeuta_id: sessaoAtualizada.terapeuta_id,
            data_hora_inicio: sessaoAtualizada.data_hora_inicio,
            dispositivo_info: sessaoAtualizada.dispositivo_info || null,
            contexto_dda: sessaoAtualizada.contexto_dda_json || {},
          },
          conexao: {
            url: wsUrl,
            canal: `session_${sessaoAtualizada.session_token}`,
            pareado_em: sessaoAtualizada.data_hora_inicio,
          },
        },
        message: 'Dispositivo pareado com sucesso.',
      });
    } catch (error) {
      console.error('[SessaoController] Erro no handshake de pareamento:', error);
      res.status(500).json({ error: 'Erro interno ao realizar pareamento' });
    }
  }

  /**
   * Handles GET /api/sessao/:token/status to check the current pairing and presence status of a session.
   *
   * @param req - Express request containing session pairing token in URL parameter `:token`.
   * @param res - Express response returning session status, mode, and device presence.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const token = String(req.params.token || '').trim();
      if (!token) {
        res.status(400).json({ error: 'Token não fornecido' });
        return;
      }

      if (!REGEX_PIN_PAREAMENTO.test(token)) {
        res.status(400).json({
          error: 'Formato de token de pareamento inválido.',
          detalhes: 'O código PIN deve conter entre 3 a 5 caracteres alfanuméricos por bloco (ex: 4M5S-8U7B ou 849291).',
        });
        return;
      }

      const sessao = await SessaoModel.buscarPorToken(token);
      if (!sessao) {
        res.status(404).json({ error: 'Sessão não encontrada' });
        return;
      }

      // Validação de expiração pelo TTL de 15 minutos (retorno 410 Gone)
      if (sessao.expira_em) {
        const agora = Date.now();
        const dataExpiracao = new Date(sessao.expira_em).getTime();

        if (agora > dataExpiracao) {
          res.status(410).json({
            error: 'Token de pareamento expirado. Solicite um novo código ao terapeuta.',
            detalhes: 'O tempo limite de 15 minutos para pareamento foi ultrapassado.',
            expirado_em: sessao.expira_em,
          });
          return;
        }
      }

      const presenca = SessaoController.obterPresencaCallback
        ? SessaoController.obterPresencaCallback(sessao.session_token)
        : null;

      res.status(200).json({
        data: {
          sessao: {
            id: sessao.id,
            session_token: sessao.session_token,
            status_sessao: sessao.status_sessao,
            modo_sessao: sessao.modo_sessao,
            data_hora_inicio: sessao.data_hora_inicio,
            expira_em: sessao.expira_em,
          },
          dispositivo: {
            info: sessao.dispositivo_info || null,
            presenca: presenca || null,
          },
          presenca_dispositivo: presenca || null,
        },
        message: 'Status da sessão consultado com sucesso.',
      });
    } catch (error) {
      console.error('[SessaoController] Erro ao consultar status da sessão:', error);
      res.status(500).json({ error: 'Erro ao consultar status da sessão' });
    }
  }

  /**
   * Handles GET /api/sessao/gerarCodigoPareamento to generate a unique random pairing code.
   *
   * @param _req - Express request.
   * @param res - Express response returning the generated pairing code.
   * @returns Resolves when the HTTP response has been sent.
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

      res.status(200).json({
        data: {
          token_pareamento: {
            codigo,
          },
        },
        message: 'Código de pareamento gerado com sucesso.',
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao gerar código de pareamento' });
    }
  }

  /**
   * Handles PATCH /api/sessao/:id/status to update the state machine status of a session.
   *
   * @param req - Express request containing session ID in `:id` and new status in body.
   * @param res - Express response returning the updated session record.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async atualizarStatus(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = authReq.contextoSessao?.id || String(req.params.id);
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: 'O campo status é obrigatório' });
        return;
      }

      if (!Object.values(STATUS_SESSAO).includes(status)) {
        res.status(400).json({ error: 'O status informado é inválido, deve conter algum desses valores: ' + Object.values(STATUS_SESSAO).join(', ') });
        return;
      }

      // Validação de integridade e trava de máquina de estados (FSM)
      const sessaoExistente = authReq.contextoSessao || await SessaoModel.buscarPorId(id);
      if (!sessaoExistente) {
        res.status(404).json({ error: 'Sessão não encontrada para atualização de status' });
        return;
      }

      const estadosTerminais: StatusSessao[] = [
        STATUS_SESSAO.FINALIZADA,
        STATUS_SESSAO.CANCELADA,
        STATUS_SESSAO.EXPIRADA,
        STATUS_SESSAO.INTERROMPIDA_POR_QUEDA,
      ];

      if (estadosTerminais.includes(sessaoExistente.status_sessao)) {
        res.status(400).json({
          error: `Transição inválida de máquina de estados: a sessão já se encontra no estado terminal '${sessaoExistente.status_sessao}'.`,
        });
        return;
      }

      const sessaoAtualizada = await SessaoModel.atualizarStatus(id, status as StatusSessao);

      if (!sessaoAtualizada) {
        res.status(404).json({ error: 'Sessão não encontrada para atualização de status' });
        return;
      }

      res.status(200).json({
        data: {
          sessao: sessaoAtualizada,
        },
        message: 'Status da sessão atualizado com sucesso.',
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno ao atualizar status da sessão' });
    }
  }

  /**
   * Handles GET /api/sessao/:id/resultado to retrieve consolidated clinical metrics and results of a finalized session.
   *
   * @param req - Authenticated Express request containing session ID in URL parameter `:id`.
   * @param res - Express response returning consolidated session metrics and clinical results.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async consultarResultado(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const usuarioLogadoId = authReq.user?.id;

      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const sessaoId = String(req.params.id || '');
      const isSuperAdmin = authReq.user?.user_metadata?.is_super_admin === true;

      const resultado = await SessaoResultadoService.obterResultadoConsolidado(
        sessaoId,
        usuarioLogadoId,
        isSuperAdmin
      );

      if (!resultado.sucesso || !resultado.dados) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(200).json({
        data: {
          sessao: resultado.dados.sessao,
          metricas_consolidadas: resultado.dados.metricas_consolidadas,
          insights_ia: resultado.dados.insights_ia,
          historico_evolutivo: resultado.dados.historico_evolutivo,
          jogo: resultado.dados.jogo,
          terapeuta: resultado.dados.terapeuta,
          paciente: resultado.dados.paciente,
          relatorio: resultado.dados.relatorio,
          anotacoes: resultado.dados.anotacoes,
          cabecalho: resultado.dados.cabecalho,
        },
        message: 'Resultado consolidado da sessão obtido com sucesso.',
      });
    } catch (error) {
      console.error('[SessaoController.consultarResultado] Erro inesperado:', error);
      res.status(500).json({ error: 'Erro interno ao consultar resultado consolidado da sessão.' });
    }
  }

  /**
   * Handles GET /api/sessao/:id/exportar to generate structured clinical reports (RF20).
   *
   * @param req - Authenticated Express request.
   * @param res - Express response returning clinical report JSON or error status.
   */
  static async exportar(req: Request, res: Response): Promise<void> {
    return SessaoExportarService.handlerExportarHttp(req, res);
  }
}

