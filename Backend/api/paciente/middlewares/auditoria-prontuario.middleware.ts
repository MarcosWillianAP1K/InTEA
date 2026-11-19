// ==============================================================================
// InTEA: Middleware de Auditoria de Acessos ao Prontuário Médico (RF08, RNF06)
// Registra visualizações (GET) sem duplicar mutações auditadas pelos controllers
// ==============================================================================

import { Request, Response, NextFunction } from 'express';
import { AuditoriaProntuarioService } from '../../auditoria/auditoria-prontuario.service.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { extrairContextoHttp } from '../../../core/utils/http-context.js';

function executarAuditoriaProntuario(
  req: Request,
  res: Response,
  next: NextFunction,
  operacaoForcada?: string
): void {
  const rawId = req.params?.id || (req.params as Record<string, string | string[]>)?.pacienteId;
  const pacienteId = Array.isArray(rawId) ? String(rawId[0] || '') : String(rawId || '');
  const method = typeof req?.method === 'string' ? req.method.toUpperCase() : 'GET';

  // Mutações de prontuário (POST/PUT/PATCH/DELETE) são auditadas diretamente nos controllers
  // para evitar duplicidade na trilha unificada; aqui registramos apenas visualizações GET
  // ou chamadas explicitamente forçadas.
  if (method !== 'GET' && !operacaoForcada) {
    next();
    return;
  }

  const operacao = operacaoForcada || 'visualizacao';

  if (typeof res?.on === 'function') {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400 && pacienteId && validarUUID(pacienteId)) {
        const usuarioAutenticado = (req as unknown as { user?: { id?: string } })?.user;
        const terapeutaId = usuarioAutenticado?.id || null;
        const { ip, userAgent } = extrairContextoHttp(req);

        void AuditoriaProntuarioService.registrarSilencioso({
          paciente_id: pacienteId,
          terapeuta_id: terapeutaId,
          operacao,
          recurso_acessado: req.originalUrl || `${req.baseUrl || ''}${req.path || ''}` || '/api/paciente',
          ip,
          user_agent: userAgent,
          detalhes_json: {
            metodo: req.method || 'GET',
            status_code: res.statusCode,
            rota: req.route?.path || req.path || '',
          },
        });
      }
    });
  }

  next();
}

export function auditoriaProntuarioMiddleware(
  operacaoExplicita: string
): (req: Request, res: Response, next: NextFunction) => void;
export function auditoriaProntuarioMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void;
export function auditoriaProntuarioMiddleware(
  reqOrOperacao: Request | string,
  res?: Response,
  next?: NextFunction
): ((req: Request, res: Response, next: NextFunction) => void) | void {
  if (typeof reqOrOperacao === 'string') {
    const operacao = reqOrOperacao;
    return (reqInner: Request, resInner: Response, nextInner: NextFunction): void => {
      executarAuditoriaProntuario(reqInner, resInner, nextInner, operacao);
    };
  }
  if (res && next) {
    executarAuditoriaProntuario(reqOrOperacao, res, next);
  }
}
