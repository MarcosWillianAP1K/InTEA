import { Request, Response } from 'express';
import { supabase } from '../../../core/supabase/supabase.client.js';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO, Sessao } from '../models/sessao.model.js';
import { PacienteModel, Paciente } from '../../paciente/models/paciente.model.js';
import { TerapeutaModel, Terapeuta } from '../../terapeuta/models/terapeuta.model.js';
import { JogoModel } from '../../jogos/models/jogo.model.js';
import {
  TelemetriaAgregacaoService,
  TelemetriaConsolidada,
} from '../../telemetria/services/telemetria-agregacao.service.js';
import { SessaoIaAnaliseService } from './sessao-ia-analise.service.js';
import { validarUUID } from '../../../core/utils/validators.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';


export interface CabecalhoLaudo {
  instituicao: string;
  cnpj_clinica: string;
  emissao_em: string;
  codigo_autenticidade: string;
}

export interface PacienteLaudo {
  id: string;
  nome: string;
  data_nascimento: string;
  idade_anos: number;
  cpf_mascarado: string;
  diagnostico_base: string;
  responsavel_legal: {
    nome: string;
    parentesco?: string;
    telefone?: string;
  } | null;
}

export interface TerapeutaLaudo {
  id: string;
  nome: string;
  registro_profissional: string;
  especialidade: string;
  email_contato: string;
}

export interface SessaoInfoLaudo {
  id: string;
  token_pareamento: string;
  jogo: {
    nome: string;
    versao: string;
  };
  data_hora_inicio: string;
  data_hora_fim: string;
  duracao_segundos: number;
  duracao_formatada: string;
  modo: string;
}

export interface MetricaTabelaItem {
  indicador: string;
  tipo: string;
  valor: string | number;
  tendencia: string;
}

export interface DesempenhoClinicoLaudo {
  taxa_conclusao: number;
  intervencoes_dda: number;
  taxa_precisao_percentual: number;
  total_toques: number;
  total_acertos: number;
  total_erros: number;
  tempo_resposta_medio: number;
  estabilidade_atencao: {
    indice: number;
    classificacao: string;
  };
  metricas_tabela: MetricaTabelaItem[];
}

export interface ParecerIaLaudo {
  sintese_analises: string[];
  motor_ia: string;
}

export interface AssinaturaFormalLaudo {
  termo_responsabilidade: string;
  terapeuta_responsavel: string;
  registro_conselho: string;
  linha_assinatura: string;
}

export interface LaudoClinicoExportavel {
  cabecalho: CabecalhoLaudo;
  paciente: PacienteLaudo;
  terapeuta: TerapeutaLaudo;
  sessao: SessaoInfoLaudo;
  desempenho_clinico: DesempenhoClinicoLaudo;
  parecer_ia: ParecerIaLaudo;
  observacoes_clinicas: string | null;
  assinatura_formal: AssinaturaFormalLaudo;
}

export interface RespostaServicoExportar {
  sucesso: boolean;
  statusHttp: number;
  erro?: string;
  dados?: LaudoClinicoExportavel;
}

// Funções de formatação e sanitização (RNF06 / LGPD)

export function mascararCPF(cpf?: string | null): string {
  if (!cpf) return 'Não informado';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return '***.***.***-**';
  return `***.${limpo.slice(3, 6)}.***-${limpo.slice(9, 11)}`;
}

export function calcularIdadeAnos(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const nascimento = new Date(dataNascimento);
  if (Number.isNaN(nascimento.getTime())) return 0;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
}

export function formatarDuracao(segundos: number): string {
  if (!segundos || segundos <= 0) return '0 min';
  const minutos = Math.floor(segundos / 60);
  const segRestantes = segundos % 60;
  if (minutos === 0) return `${segRestantes}s`;
  if (segRestantes === 0) return `${minutos} min`;
  return `${minutos} min ${segRestantes}s`;
}

export class SessaoExportarService {
  /**
   * Compila e estrutura o laudo clínico sanitizado da sessão para exportação em PDF e impressão (RF20).
   *
   * @param sessaoId - UUID da sessão finalizada
   * @param usuarioAutenticado - Dados do terapeuta autenticado na requisição
   */
  static async gerarLaudoExportacao(
    sessaoId: string,
    usuarioAutenticado: { id: string; user_metadata?: { is_super_admin?: boolean } } | null
  ): Promise<RespostaServicoExportar> {
    // 1. Validação do parâmetro de identificação da sessão
    if (!sessaoId || !validarUUID(sessaoId)) {
      return {
        sucesso: false,
        statusHttp: 400,
        erro: 'Identificador de sessão inválido: deve ser um UUID válido.',
      };
    }

    // 2. Busca a sessão clínica no banco
    const sessao = await SessaoModel.buscarPorId(sessaoId);
    if (!sessao) {
      return {
        sucesso: false,
        statusHttp: 404,
        erro: 'Sessão clínica não encontrada.',
      };
    }

    // 3. Validação de máquina de estados: sessão DEVE estar finalizada
    if (sessao.status_sessao !== STATUS_SESSAO.FINALIZADA) {
      return {
        sucesso: false,
        statusHttp: 400,
        erro: `Não é possível exportar laudo de uma sessão que não está finalizada (status atual: '${sessao.status_sessao}').`,
      };
    }

    // 4. Validação de RN01 (Modo Livre não gera laudo de paciente)
    if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
      return {
        sucesso: false,
        statusHttp: 400,
        erro: 'Sessões em Modo Livre não possuem paciente associado nem geram laudo clínico (RN01).',
      };
    }

    // 5. Validação institucional de acesso (RN04)
    const isSuperAdmin = usuarioAutenticado?.user_metadata?.is_super_admin === true;
    const isDono = usuarioAutenticado?.id === sessao.terapeuta_id;

    if (!isSuperAdmin && !isDono) {
      const temVinculo = await this.verificarVinculoInstitucional(
        usuarioAutenticado?.id || '',
        sessao.paciente_id
      );

      if (!temVinculo) {
        return {
          sucesso: false,
          statusHttp: 403,
          erro: 'Acesso negado: terapeuta não possui vínculo clínico institucional ativo com este paciente (RN04).',
        };
      }
    }

    // 6. Busca dados do Paciente e Diagnóstico Base
    let pacienteDb: Paciente | null = null;
    try {
      pacienteDb = await PacienteModel.buscarPorId(sessao.paciente_id);
    } catch (errPac) {
      console.warn('[SessaoExportarService] Erro ao buscar paciente:', errPac);
    }

    if (!pacienteDb) {
      return {
        sucesso: false,
        statusHttp: 404,
        erro: 'Paciente associado à sessão não foi localizado no cadastro.',
      };
    }

    const diagnosticoBase = await this.buscarDiagnosticoPaciente(sessao.paciente_id);

    // 7. Busca dados do Terapeuta Autor
    let terapeutaDb: Terapeuta | null = null;
    try {
      terapeutaDb = await TerapeutaModel.buscarPorId(sessao.terapeuta_id);
    } catch (errTer) {
      console.warn('[SessaoExportarService] Erro ao buscar terapeuta:', errTer);
    }

    // 8. Busca dados da Clínica institucional
    const clinicaId = terapeutaDb?.clinica_id || pacienteDb.clinica_id;
    const { nome: clinicaNome, cnpj: clinicaCnpj } = await this.buscarDadosClinica(clinicaId);

    // 9. Busca dados do Jogo
    let jogoNome = 'Jogo Terapêutico Cognitivo';
    let jogoVersao = '1.0.0';
    try {
      const jogo = await JogoModel.buscarPorId(sessao.jogo_id);
      if (jogo) {
        jogoNome = jogo.nome || jogoNome;
        jogoVersao = jogo.versao || jogoVersao;
      }
    } catch (errJogo) {
      console.warn('[SessaoExportarService] Erro ao buscar jogo:', errJogo);
    }

    // 10. Agregação estatística de Telemetria (Card 2.1)
    const telemetriaConsolidada = await TelemetriaAgregacaoService.compilarPorSessaoId(sessao.id);

    // 11. Síntese do Agente de IA aderente ao Contrato 4 (Card 2.2)
    const relatorioIA = SessaoIaAnaliseService.sintetizarRelatorio(sessao, telemetriaConsolidada);

    // 12. Busca de eventuais Anotações Clínicas / Pareceres
    const observacoesTerapeuta = await this.buscarObservacoesSessao(sessao.id);

    // 13. Montagem da tabela de métricas com formatação clínica
    const tabelaMetricas: MetricaTabelaItem[] = [];
    if (telemetriaConsolidada && telemetriaConsolidada.metricas_agregadas) {
      for (const m of telemetriaConsolidada.metricas_agregadas) {
        if (m.tipo_metrica === 'numerica') {
          tabelaMetricas.push({
            indicador: m.id_metrica,
            tipo: 'Numérica',
            valor: `${m.media} ${m.unidade || ''}`.trim(),
            tendencia: m.tendencia,
          });
        } else {
          tabelaMetricas.push({
            indicador: m.id_metrica,
            tipo: 'Categórica',
            valor: m.valor_dominante,
            tendencia: m.tendencia,
          });
        }
      }
    }

    // Se a tabela estiver vazia, adiciona resumo padrão de tempo de resposta se existir
    if (tabelaMetricas.length === 0 && telemetriaConsolidada && telemetriaConsolidada.tempo_resposta.total_amostras > 0) {
      tabelaMetricas.push({
        indicador: 'tempo_resposta',
        tipo: 'Numérica',
        valor: `${telemetriaConsolidada.tempo_resposta.media} ${telemetriaConsolidada.tempo_resposta.unidade}`,
        tendencia: 'estavel',
      });
    }

    // 14. Duração calculada determinística
    const inicioMs = sessao.data_hora_inicio ? new Date(sessao.data_hora_inicio).getTime() : 0;
    const fimMs = sessao.data_hora_fim ? new Date(sessao.data_hora_fim).getTime() : 0;
    const duracaoSegundos = Math.max(0, Math.round((fimMs - inicioMs) / 1000)) || (telemetriaConsolidada?.duracao_estimada_segundos || 0);

    const registroProfissional =
      terapeutaDb?.crefito || terapeutaDb?.registro_profissional || 'CREFITO/CRP não informado';

    // 15. Identificação de responsável legal sanitizado
    let responsavelLegal = null;
    if (Array.isArray(pacienteDb.responsaveis) && pacienteDb.responsaveis.length > 0) {
      const respObj = pacienteDb.responsaveis[0]?.responsavel || pacienteDb.responsaveis[0];
      if (respObj && typeof respObj === 'object') {
        responsavelLegal = {
          nome: String(respObj.nome || 'Responsável Legal'),
          parentesco: respObj.parentesco ? String(respObj.parentesco) : undefined,
          telefone: respObj.telefone ? String(respObj.telefone) : undefined,
        };
      }
    }

    // 16. Montagem final do payload sanitizado do laudo (RF20 / RNF06)
    const laudoEstruturado: LaudoClinicoExportavel = {
      cabecalho: {
        instituicao: clinicaNome,
        cnpj_clinica: clinicaCnpj,
        emissao_em: new Date().toISOString(),
        codigo_autenticidade: `INTEA-LAUDO-${sessao.id.slice(0, 8).toUpperCase()}`,
      },
      paciente: {
        id: pacienteDb.id,
        nome: pacienteDb.nome,
        data_nascimento: pacienteDb.data_nascimento,
        idade_anos: calcularIdadeAnos(pacienteDb.data_nascimento),
        cpf_mascarado: mascararCPF(pacienteDb.cpf),
        diagnostico_base: diagnosticoBase,
        responsavel_legal: responsavelLegal,
      },
      terapeuta: {
        id: terapeutaDb?.id || sessao.terapeuta_id,
        nome: terapeutaDb?.nome || 'Terapeuta Responsável',
        registro_profissional: registroProfissional,
        especialidade: terapeutaDb?.especialidade || 'Terapia Ocupacional / Psicologia',
        email_contato: terapeutaDb?.email || 'contato@clinica.com.br',
      },
      sessao: {
        id: sessao.id,
        token_pareamento: sessao.session_token,
        jogo: {
          nome: jogoNome,
          versao: jogoVersao,
        },
        data_hora_inicio: sessao.data_hora_inicio,
        data_hora_fim: sessao.data_hora_fim || new Date().toISOString(),
        duracao_segundos: duracaoSegundos,
        duracao_formatada: formatarDuracao(duracaoSegundos),
        modo: 'Sessão Clínica Supervisionada',
      },
      desempenho_clinico: {
        taxa_conclusao: relatorioIA?.resumo.taxa_conclusao || 0,
        intervencoes_dda: relatorioIA?.resumo.intervencoes_dda || 0,
        taxa_precisao_percentual: telemetriaConsolidada?.precisao.taxa_precisao_percentual || 0,
        total_toques: telemetriaConsolidada?.precisao.total_toques || 0,
        total_acertos: telemetriaConsolidada?.precisao.total_acertos || 0,
        total_erros: telemetriaConsolidada?.precisao.total_erros || 0,
        tempo_resposta_medio: telemetriaConsolidada?.tempo_resposta.media || 0,
        estabilidade_atencao: {
          indice: telemetriaConsolidada?.estabilidade_atencao.indice_estabilidade || 0,
          classificacao: telemetriaConsolidada?.estabilidade_atencao.classificacao || 'sem_dados',
        },
        metricas_tabela: tabelaMetricas,
      },
      parecer_ia: {
        sintese_analises: relatorioIA?.analises_ia || [
          'Sessão concluída com estabilidade motora e cognitiva observada durante a partida.',
        ],
        motor_ia: 'InTEA AI Contextual Engine (DDA)',
      },
      observacoes_clinicas: observacoesTerapeuta,
      assinatura_formal: {
        termo_responsabilidade:
          'Documento digital emitido pelo ecossistema InTEA. Válido para prontuário clínico e avaliação multidisciplinar mediante carimbo e assinatura do profissional habilitado.',
        terapeuta_responsavel: terapeutaDb?.nome || 'Terapeuta Responsável',
        registro_conselho: registroProfissional,
        linha_assinatura: '__________________________________________________',
      },
    };

    return {
      sucesso: true,
      statusHttp: 200,
      dados: laudoEstruturado,
    };
  }

  /**
   * Express Handler para endpoint REST: GET /api/sessao/:id/exportar
   */
  static async handlerExportarHttp(req: Request, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params.id || '');
      const usuarioLogado = (req as AuthenticatedRequest).user;

      const resultado = await SessaoExportarService.gerarLaudoExportacao(sessaoId, usuarioLogado);

      if (!resultado.sucesso) {
        res.status(resultado.statusHttp).json({ error: resultado.erro });
        return;
      }

      res.status(resultado.statusHttp).json({
        data: resultado.dados,
      });
    } catch (error) {
      console.error('[SessaoExportarService] Erro ao exportar laudo clínico:', error);
      res.status(500).json({ error: 'Erro interno ao emitir laudo clínico para exportação.' });
    }
  }

  /**
   * Busca o diagnóstico clínico base do paciente na tabela dados_clinicos (ou fallback seguro).
   */
  static async buscarDiagnosticoPaciente(pacienteId: string): Promise<string> {
    const padrao = 'Transtorno do Espectro Autista (TEA)';
    if (!pacienteId || !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder')) {
      return padrao;
    }
    try {
      const { data } = await supabase
        .from('dados_clinicos')
        .select('diagnostico_base')
        .eq('paciente_id', pacienteId)
        .maybeSingle();
      const registro = data as { diagnostico_base?: string } | null;
      return registro?.diagnostico_base || padrao;
    } catch {
      return padrao;
    }
  }

  /**
   * Busca dados da clínica (nome e CNPJ) para emissão institucional do laudo.
   */
  static async buscarDadosClinica(
    clinicaId?: string | null
  ): Promise<{ nome: string; cnpj: string }> {
    const padrao = { nome: 'Clínica Integrada InTEA', cnpj: 'Não informado' };
    if (!clinicaId || !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder')) {
      return padrao;
    }
    try {
      const { data } = await supabase
        .from('clinica')
        .select('nome, cnpj')
        .eq('id', clinicaId)
        .maybeSingle();
      const registro = data as { nome?: string; cnpj?: string } | null;
      return {
        nome: registro?.nome || padrao.nome,
        cnpj: registro?.cnpj || padrao.cnpj,
      };
    } catch {
      return padrao;
    }
  }

  /**
   * Busca observações clínicas ou pareceres descritivos registrados para a sessão.
   */
  static async buscarObservacoesSessao(sessaoId: string): Promise<string | null> {
    if (!sessaoId || !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder')) {
      return null;
    }
    try {
      const { data: relatorio } = await supabase
        .from('relatorio_sessao')
        .select('conteudo')
        .eq('sessao_id', sessaoId)
        .eq('soft_delete', false)
        .maybeSingle();
      const relatorioRegistro = relatorio as { conteudo?: string } | null;
      if (relatorioRegistro?.conteudo) {
        return relatorioRegistro.conteudo;
      }

      const { data: anotacao } = await supabase
        .from('anotacao_clinica')
        .select('conteudo')
        .eq('sessao_id', sessaoId)
        .eq('soft_delete', false)
        .maybeSingle();
      const anotacaoRegistro = anotacao as { conteudo?: string } | null;
      return anotacaoRegistro?.conteudo || null;
    } catch {
      return null;
    }
  }

  /**
   * Valida se o terapeuta possui vínculo clínico institucional ativo com o paciente (RN04).
   */
  static async verificarVinculoInstitucional(
    terapeutaId: string,
    pacienteId: string
  ): Promise<boolean> {
    if (!terapeutaId || !pacienteId) return false;
    try {
      const { data, error } = await supabase
        .from('terapeuta_paciente')
        .select('terapeuta_id')
        .eq('terapeuta_id', terapeutaId)
        .eq('paciente_id', pacienteId)
        .maybeSingle();
      if (error) return false;
      return Boolean(data);
    } catch {
      return false;
    }
  }
}
