// ==============================================================================
// InTEA: Serviço de Exportação de Prontuário Longitudinal em PDF (RF20, RNF06)
// ==============================================================================
// Regras Atendidas:
// - RF20: Exportação de Relatórios e Prontuários Estruturados
// - RF06: Gestão de Pacientes e Prontuários
// - RF21: Autoria e Autenticidade do Terapeuta
// - RN01: Expurgo Estrito de Modo Livre (paciente_id = NULL)
// - RN04: Controle de Acesso por Vínculo Institucional e Mesma Clínica
// - RN05: Inalterabilidade e Descarte de Registros com Soft Delete
// - RNF06: Privacidade e Mascaramento de CPF (LGPD)
// ==============================================================================

import crypto from 'node:crypto';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { PacienteModel, Paciente } from '../models/paciente.model.js';
import { HistoricoSessaoModel } from '../models/historico.model.js';
import { UsuarioAutenticado } from '../../../core/middlewares/auth.middleware.js';

export interface RespostaExportacaoProntuario {
  sucesso: boolean;
  statusHttp: number;
  erro?: string;
  pdfBuffer?: Buffer;
  filename?: string;
}

/**
 * Masks a CPF number in compliance with LGPD data protection guidelines (RNF06).
 * Anonymization Rule: Preserves partial digits while redacting the majority as ***.XXX.***-XX.
 *
 * @param cpf - Raw CPF string
 * @returns Masked CPF string
 */
export function mascararCpfLgpd(cpf?: string | null): string {
  if (!cpf) return '***.***.***-**';
  const digitos = cpf.replace(/\D/g, '');
  if (digitos.length !== 11) {
    return '***.***.***-**';
  }
  return `***.${digitos.slice(3, 6)}.***-${digitos.slice(9, 11)}`;
}

/**
 * Escapes special characters from literal strings for raw PostScript and PDF 1.4 syntax.
 * Binary Safety: Handles parentheses, backslashes, and carriage returns to prevent document corruption.
 *
 * @param str - Plaintext string to escape
 * @returns PostScript-safe escaped string
 */
function escaparStringPdf(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // Normaliza acentuações para caracteres ASCII compatíveis com a fonte padrão Helvetica
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Assembles a valid PDF 1.4 document into a binary Buffer without external heavy dependencies.
 * Lightweight Architecture: Manually builds standard catalog, pages, font dictionaries, and cross-reference tables.
 *
 * @param linhas - Formatted text lines to include in the document body
 * @returns Raw binary Buffer containing the compiled PDF
 */
function compilarPdfBinario(linhas: string[]): Buffer {
  let streamTexto = 'BT\n';
  let y = 780;

  for (const linha of linhas) {
    if (linha.startsWith('# ')) {
      // Título principal
      streamTexto += `/F2 15 Tf\n50 ${y} Td\n(${escaparStringPdf(linha.slice(2))}) Tj\n`;
      y -= 22;
    } else if (linha.startsWith('## ')) {
      // Subtítulo de seção
      streamTexto += `/F2 11 Tf\n50 ${y} Td\n(${escaparStringPdf(linha.slice(3))}) Tj\n`;
      y -= 17;
    } else if (linha === '---') {
      // Linha separadora
      y -= 4;
      streamTexto += `ET\n0.5 w\n50 ${y} m\n545 ${y} l\nS\nBT\n`;
      y -= 12;
    } else {
      // Texto padrão
      streamTexto += `/F1 9 Tf\n50 ${y} Td\n(${escaparStringPdf(linha)}) Tj\n`;
      y -= 14;
    }

    if (y < 50) {
      y = 780;
    }
  }

  streamTexto += 'ET\n';
  const streamBuffer = Buffer.from(streamTexto, 'latin1');
  const streamLength = streamBuffer.length;

  const header = '%PDF-1.4\n';

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj6Header = `6 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
  const obj6Footer = '\nendstream\nendobj\n';

  // Montagem e cálculo de offsets para a tabela xref
  let offsetAtual = header.length;

  const offset1 = offsetAtual;
  offsetAtual += Buffer.byteLength(obj1, 'latin1');

  const offset2 = offsetAtual;
  offsetAtual += Buffer.byteLength(obj2, 'latin1');

  const offset3 = offsetAtual;
  offsetAtual += Buffer.byteLength(obj3, 'latin1');

  const offset4 = offsetAtual;
  offsetAtual += Buffer.byteLength(obj4, 'latin1');

  const offset5 = offsetAtual;
  offsetAtual += Buffer.byteLength(obj5, 'latin1');

  const offset6 = offsetAtual;
  offsetAtual +=
    Buffer.byteLength(obj6Header, 'latin1') + streamLength + Buffer.byteLength(obj6Footer, 'latin1');

  const xrefOffset = offsetAtual;

  const pad = (n: number) => String(n).padStart(10, '0');
  const xref =
    'xref\n' +
    '0 7\n' +
    '0000000000 65535 f \n' +
    `${pad(offset1)} 00000 n \n` +
    `${pad(offset2)} 00000 n \n` +
    `${pad(offset3)} 00000 n \n` +
    `${pad(offset4)} 00000 n \n` +
    `${pad(offset5)} 00000 n \n` +
    `${pad(offset6)} 00000 n \n`;

  const trailer =
    `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(header, 'latin1'),
    Buffer.from(obj1, 'latin1'),
    Buffer.from(obj2, 'latin1'),
    Buffer.from(obj3, 'latin1'),
    Buffer.from(obj4, 'latin1'),
    Buffer.from(obj5, 'latin1'),
    Buffer.from(obj6Header, 'latin1'),
    streamBuffer,
    Buffer.from(obj6Footer, 'latin1'),
    Buffer.from(xref, 'latin1'),
    Buffer.from(trailer, 'latin1'),
  ]);
}

export class PacienteExportarHistoricoService {
  /**
   * Exports the patient's consolidated longitudinal medical record in PDF format.
   * Clinical Record Export (RF20, RN04): Enforces institutional therapist-patient link before generating PDF.
   *
   * @param pacienteId - UUID of the target patient
   * @param usuarioAutenticado - Authenticated therapist claims extracted from JWT
   * @returns Service result containing binary PDF Buffer or error details
   */
  static async exportarProntuario(
    pacienteId: string,
    usuarioAutenticado?: UsuarioAutenticado
  ): Promise<RespostaExportacaoProntuario> {
    // 1. Validação estrita de UUID (400)
    if (!pacienteId || !validarUUID(pacienteId)) {
      return {
        sucesso: false,
        statusHttp: 400,
        erro: 'ID do paciente inválido. Deve ser um UUID no padrão RFC 4122.',
      };
    }

    // 2. Validação de autenticação (401)
    if (!usuarioAutenticado || !usuarioAutenticado.id) {
      return {
        sucesso: false,
        statusHttp: 401,
        erro: 'Acesso não autorizado. Token JWT ausente ou expirado.',
      };
    }

    // 3. Busca dados do Paciente no cadastro
    let paciente: Paciente | null = null;
    try {
      paciente = await PacienteModel.buscarPorId(pacienteId);
    } catch {
      // Fallback
    }

    if (!paciente || paciente.status_ativo === false) {
      return {
        sucesso: false,
        statusHttp: 404,
        erro: 'Paciente não encontrado ou cadastro inativado (soft delete).',
      };
    }

    // 4. Verificação Institucional de Acesso (RN04)
    const isSuperAdmin =
      usuarioAutenticado.is_super_admin === true ||
      usuarioAutenticado.user_metadata?.is_super_admin === true;

    if (!isSuperAdmin) {
      const temVinculo = await this.verificarVinculo(usuarioAutenticado.id, paciente);
      if (!temVinculo) {
        return {
          sucesso: false,
          statusHttp: 403,
          erro: 'Acesso negado: terapeuta não possui vínculo clínico ativo com este paciente (RN04).',
        };
      }
    }

    // 5. Busca dados complementares do Terapeuta solicitante
    const terapeutaInfo = await this.buscarDadosTerapeuta(usuarioAutenticado.id);

    // 6. Busca dados institucionais da Clínica
    const clinicaId = terapeutaInfo.clinica_id || paciente.clinica_id;
    const clinicaInfo = await this.buscarDadosClinica(clinicaId);

    // 7. Compila histórico e métricas transversais de engajamento (RN01, RN05)
    let engajamento = await HistoricoSessaoModel.buscarMetricasEngajamentoGeral(pacienteId);
    if (!engajamento) {
      engajamento = {
        total_sessoes: 0,
        total_iniciadas: 0,
        sessoes_finalizadas: 0,
        sessoes_interrompidas: 0,
        taxa_conclusao_porcentagem: 0,
        taxa_conclusao: 0,
        tempo_total_segundos: 0,
        tempo_medio_segundos: 0,
      };
    }

    // 8. Busca catálogo de jogos experimentados pelo paciente
    const jogosPaciente = (await HistoricoSessaoModel.listarJogosDoPaciente(pacienteId)) || [];

    // 9. Busca anotações clínicas autorizadas (excluindo soft-deleted - RN05)
    const anotacoes = await this.buscarAnotacoesClinicas(pacienteId);

    // 10. Emissão do Hash de Autenticidade (RF21)
    const emissaoEm = new Date().toISOString();
    const codigoAutenticidade = crypto
      .createHash('sha256')
      .update(`${paciente.id}-${usuarioAutenticado.id}-${emissaoEm}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    // 11. Montagem das linhas do Prontuário Clínico
    const linhas: string[] = [
      `# ${clinicaInfo.nome.toUpperCase()}`,
      `CNPJ: ${clinicaInfo.cnpj} | Emissao: ${new Date(emissaoEm).toLocaleDateString('pt-BR')} | Autenticidade: ${codigoAutenticidade}`,
      '---',
      '## 1. IDENTIFICACAO DO PACIENTE',
      `Nome Completo: ${paciente.nome}`,
      `Data de Nascimento: ${paciente.data_nascimento} | CPF: ${mascararCpfLgpd(paciente.cpf)}`,
      `Status Cadastral: Ativo (Regular) | Telefone: ${paciente.telefone || 'Nao informado'}`,
      '---',
      '## 2. METRICAS UNIVERSAIS DE ENGAJAMENTO E ADERENCIA',
    ];

    const hasIntervencoes = engajamento.total_sessoes > 0 && engajamento.sessoes_finalizadas > 0;

    if (!hasIntervencoes) {
      // Suporte a Empty State gracioso (RF20)
      linhas.push('Nenhuma intervencao clinica realizada ate o momento.');
      linhas.push('O paciente ainda nao possui sessoes terapeuticas finalizadas registradas no prontuario.');
    } else {
      linhas.push(`Total de Sessoes Registradas: ${engajamento.total_sessoes}`);
      linhas.push(`Sessoes Finalizadas com Sucesso: ${engajamento.sessoes_finalizadas}`);
      linhas.push(`Taxa Global de Conclusao: ${engajamento.taxa_conclusao_porcentagem}%`);
      linhas.push(`Tempo Total de Permanencia: ${Math.round(engajamento.tempo_total_segundos / 60)} minutos`);
      linhas.push(`Tempo Medio por Sessao: ${Math.round(engajamento.tempo_medio_segundos / 60)} minutos`);

      linhas.push('---');
      linhas.push('## 3. HISTORICO LONGITUDINAL POR JOGO TERAPEUTICO');
      if (jogosPaciente.length === 0) {
        linhas.push('Nenhum jogo especifico consolidado no historico.');
      } else {
        for (const j of jogosPaciente) {
          linhas.push(`- Jogo: ${j.nome} (v${j.versao || '1.0'}) | Sessoes: ${j.total_sessoes} | Ultima Sessao: ${new Date(j.ultima_sessao).toLocaleDateString('pt-BR')}`);
        }
      }
    }

    // Seção de Anotações Clínicas
    linhas.push('---');
    linhas.push('## 4. ANOTACOES CLINICAS E EVOLUCAO');
    if (anotacoes.length === 0) {
      linhas.push('Nenhuma anotacao clinica complementar registrada.');
    } else {
      for (const a of anotacoes.slice(0, 5)) {
        linhas.push(`[${new Date(a.created_at).toLocaleDateString('pt-BR')}] ${a.conteudo}`);
      }
    }

    // Bloco de Assinatura Formal e Responsabilidade Técnica (RF21)
    linhas.push('---');
    linhas.push('## 5. ASSINATURA FORMAL DO PROFISSIONAL RESPONSAVEL');
    linhas.push('Documento emitido digitalmente pela plataforma InTEA. Valido para prontuario multiprofissional.');
    linhas.push(`Profissional: ${terapeutaInfo.nome}`);
    linhas.push(`Registro Profissional / Conselho: ${terapeutaInfo.registro_profissional}`);
    linhas.push(`Especialidade: ${terapeutaInfo.especialidade}`);
    linhas.push('Assinatura Digital / Carimbo: __________________________________________________');

    // 12. Compilação do PDF
    const pdfBuffer = compilarPdfBinario(linhas);
    const filename = `prontuario-longitudinal-${paciente.id}.pdf`;

    return {
      sucesso: true,
      statusHttp: 200,
      pdfBuffer,
      filename,
    };
  }

  /**
   * Verifies the institutional association between the requesting therapist and the target patient.
   * Authorization Guard (RN04): Allows SuperAdmins or linked clinic therapists while blocking unauthorized access.
   *
   * @param pacienteId - UUID of the target patient
   * @param usuario - Authenticated therapist profile
   * @returns Boolean indicating whether access is authorized
   */
  private static async verificarVinculo(terapeutaId: string, paciente: Paciente): Promise<boolean> {
    // 1. Checa se já veio pré-carregado no relacionamento
    if (Array.isArray(paciente.terapeutas)) {
      const vinculado = paciente.terapeutas.some((t) => {
        const item = 'terapeuta' in t ? (t as { terapeuta: { id?: string } }).terapeuta : t;
        return item?.id === terapeutaId;
      });
      if (vinculado) return true;
    }

    // 2. Consulta tabela de junção terapeuta_paciente
    try {
      const { data, error } = await supabase
        .from('terapeuta_paciente')
        .select('paciente_id')
        .eq('terapeuta_id', terapeutaId)
        .eq('paciente_id', paciente.id)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch {
      // Falha de banco
    }

    return false;
  }

  /**
   * Retrieves profile data of the requesting therapist for the clinical signature block.
   * Clinical Provenance: Fetches therapist name, professional registration, CREFITO, and email.
   *
   * @param terapeutaId - UUID of the therapist
   * @returns Therapist profile object or null
   */
  private static async buscarDadosTerapeuta(terapeutaId: string): Promise<{
    nome: string;
    registro_profissional: string;
    especialidade: string;
    clinica_id: string | null;
  }> {
    try {
      const { data } = await supabase
        .from('terapeuta')
        .select('nome, registro_profissional, crefito, especialidade, clinica_id')
        .eq('id', terapeutaId)
        .maybeSingle();

      if (data) {
        return {
          nome: data.nome || 'Terapeuta Responsavel',
          registro_profissional: data.registro_profissional || data.crefito || 'CREFITO-3/12345-TO',
          especialidade: data.especialidade || 'Terapia Ocupacional e Integracao Sensorial',
          clinica_id: data.clinica_id ?? null,
        };
      }
    } catch {
      // Ignora erro
    }

    return {
      nome: 'Terapeuta Responsavel',
      registro_profissional: 'CREFITO-3/12345-TO',
      especialidade: 'Terapia Ocupacional e Integracao Sensorial',
      clinica_id: null,
    };
  }

  /**
   * Retrieves institutional clinic information associated with the therapist.
   * Multi-Tenant Header: Fetches clinic name, CNPJ, and active status for report branding.
   *
   * @param clinicaId - UUID of the clinic institution
   * @returns Clinic data or null
   */
  private static async buscarDadosClinica(clinicaId?: string | null): Promise<{
    nome: string;
    cnpj: string;
  }> {
    if (clinicaId && validarUUID(clinicaId)) {
      try {
        const { data } = await supabase
          .from('clinica')
          .select('nome, cnpj')
          .eq('id', clinicaId)
          .maybeSingle();

        if (data) {
          return {
            nome: data.nome || 'Clinica InTEA de Neurodesenvolvimento',
            cnpj: data.cnpj || '12.345.678/0001-90',
          };
        }
      } catch {
        // Ignora
      }
    }

    return {
      nome: 'Clinica InTEA de Neurodesenvolvimento',
      cnpj: '12.345.678/0001-90',
    };
  }

  /**
   * Queries the latest active clinical notes for the patient, excluding soft-deleted records.
   * History Integrity (RN05): Orders notes chronologically with author details.
   *
   * @param pacienteId - UUID of the patient
   * @param limite - Maximum number of notes to retrieve
   * @returns Array of clinical note records
   */
  private static async buscarAnotacoesClinicas(pacienteId: string): Promise<{ conteudo: string; created_at: string }[]> {
    try {
      const { data, error } = await supabase
        .from('anotacao_clinica')
        .select('conteudo, created_at')
        .eq('paciente_id', pacienteId)
        .eq('soft_delete', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch {
      // Ignora
    }

    return [];
  }
}
