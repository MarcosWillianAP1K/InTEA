// ==============================================================================
// InTEA: Middleware de Auditoria de Acessos ao Prontuário Médico (RF08, RNF06)
// Registra automaticamente visualizações (GET), alterações (PUT/PATCH) e exclusões lógicas (DELETE)
// ==============================================================================

import { Request, Response, NextFunction } from 'express';
import { AuditoriaProntuarioService } from '../../auditoria/auditoria-prontuario.service.js';
import { validarUUID } from '../../../core/utils/validators.js';

export function auditoriaProntuarioMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawId = req.params.id || (req.params as Record<string, string | string[]>).pacienteId;
  const pacienteId = Array.isArray(rawId) ? String(rawId[0] || '') : String(rawId || '');

  // Determina a operação clínica com base no método HTTP
  let operacao: string;
  switch (req.method.toUpperCase()) {
    case 'GET':
      operacao = 'visualizacao';
      break;
    case 'PUT':
    case 'PATCH':
      operacao = 'alteracao';
      break;
    case 'DELETE':
      operacao = 'exclusao_logica';
      break;
    default:
      operacao = req.method.toLowerCase();
  }

  // Intercepta o fechamento da resposta HTTP
  res.on('finish', () => {
    // Registra acessos válidos (status 2xx ou 3xx) em rotas que contenham UUID válido de paciente
    if (res.statusCode >= 200 && res.statusCode < 400 && pacienteId && validarUUID(pacienteId)) {
      const usuarioAutenticado = (req as unknown as { user?: { id?: string } }).user;
      const terapeutaId = usuarioAutenticado?.id || null;

      const headerIp = req.headers['x-forwarded-for'];
      const rawIp = Array.isArray(headerIp) ? headerIp[0] : headerIp || req.socket?.remoteAddress || req.ip || null;
      const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : null;

      const userAgentHeader = req.headers['user-agent'];
      const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || null;

      AuditoriaProntuarioService.registrarSilencioso({
        paciente_id: pacienteId,
        terapeuta_id: terapeutaId,
        operacao,
        recurso_acessado: req.originalUrl || req.baseUrl + req.path,
        ip,
        user_agent: userAgent,
        detalhes_json: {
          metodo: req.method,
          status_code: res.statusCode,
          rota: req.route?.path || req.path,
        },
      });
    }
  });

  next();
}
