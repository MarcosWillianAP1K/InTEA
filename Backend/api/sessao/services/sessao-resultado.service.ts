// ==============================================================================
// InTEA: Serviço de Consolidação dos Resultados da Sessão (Sprint 10 - Card 1.2)
// ==============================================================================
// Conformidade: RF14 (Tela de Resultados), RN01 (Modo Livre), RN04 (Vínculo/Clínica)
// Contrato 4 (Síntese de IA) e RNF02 (Desempenho)
// TypeScript Estrito: Sem 'any'
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';
import { SessaoModel, STATUS_SESSAO, MODO_SESSAO } from '../models/sessao.model.js';
import { RelatorioSessaoModel, RelatorioIAContrato } from '../models/relatorio.model.js';
import { AnotacaoClinicaModel } from '../../anotacao/models/anotacao.model.js';
import { SessaoTokenService } from './sessao-token.service.js';
import { validarUUID } from '../../../core/utils/validators.js';

export interface SessaoResultadoJogo {
  id: string;
  nome: string;
  versao: string;
  descricao?: string | null;
}

export interface SessaoResultadoTerapeuta {
  id: string;
  nome: string;
  registro_profissional?: string | null;
  crefito?: string | null;
}

export interface SessaoResultadoPaciente {
  id: string;
  nome: string;
  data_nascimento?: string | null;
  cpf?: string | null;
}

export interface SessaoResultadoAnotacaoItem {
  id: string;
  terapeuta_id: string;
  conteudo: string;
  created_at: string;
}

export interface SessaoResultadoConsolidado {
  sessao: {
    id: string;
    session_token: string;
    modo_sessao: 'sessao_clinica' | 'modo_livre';
    status_sessao: string;
    data_hora_inicio: string;
    data_hora_fim: string | null;
    duracao_segundos: number;
    dispositivo_info?: Record<string, unknown> | null;
  };
  jogo: SessaoResultadoJogo | null;
  terapeuta: SessaoResultadoTerapeuta | null;
  paciente: SessaoResultadoPaciente | null;
  relatorio: {
    conteudo: string | null;
    dados_ia_json: RelatorioIAContrato;
  } | null;
  anotacoes: SessaoResultadoAnotacaoItem[];
}

export interface RespostaResultadoService {
  sucesso: boolean;
  status: number;
  dados?: SessaoResultadoConsolidado;
  erro?: string;
}

export class SessaoResultadoService {
  /**
   * Consolidates clinical and analytical result data for a finalized session.
   * Validates institutional permissions (RN04) and suppresses clinical data for free-mode sessions (RN01).
   *
   * @param sessaoId - UUID of the session to retrieve.
   * @param terapeutaId - UUID of the requesting therapist.
   * @param isSuperAdmin - Whether the requesting user has super-admin privileges.
   * @returns Service response containing consolidated session results or an error payload.
   */
  static async obterResultadoConsolidado(
    sessaoId: string,
    terapeutaId: string,
    isSuperAdmin = false
  ): Promise<RespostaResultadoService> {
    try {
      // 1. Validação de sintaxe do identificador único (UUID)
      if (!sessaoId || !validarUUID(sessaoId)) {
        return {
          sucesso: false,
          status: 400,
          erro: 'O identificador da sessão informado deve ser um UUID válido.',
        };
      }

      // 2. Busca da sessão no banco de dados
      const sessao = await SessaoModel.buscarPorId(sessaoId);
      if (!sessao) {
        return {
          sucesso: false,
          status: 404,
          erro: 'Sessão clínica não encontrada.',
        };
      }

      // 3. Validação da Máquina de Estados (FSM)
      // Apenas sessões finalizadas possuem consolidação de resultados (RF14)
      if (sessao.status_sessao !== STATUS_SESSAO.FINALIZADA) {
        return {
          sucesso: false,
          status: 400,
          erro: `A consulta consolidada de resultados só está disponível para sessões finalizadas. Status atual: '${sessao.status_sessao}'.`,
        };
      }

      // 4. Verificação de Visibilidade e Vínculo Institucional (RN04)
      if (sessao.modo_sessao === MODO_SESSAO.SESSAO_CLINICA && sessao.paciente_id) {
        if (!isSuperAdmin) {
          // Consulta o perfil do terapeuta requisitante
          const { data: terapeutaReq, error: errTerapeuta } = await supabase
            .from('terapeuta')
            .select('id, clinica_id, is_super_admin, status_ativo')
            .eq('id', terapeutaId)
            .maybeSingle();

          if (errTerapeuta || !terapeutaReq) {
            return {
              sucesso: false,
              status: 403,
              erro: 'Acesso negado: perfil de terapeuta associado ao token não encontrado.',
            };
          }

          if (!terapeutaReq.is_super_admin) {
            if (!terapeutaReq.status_ativo) {
              return {
                sucesso: false,
                status: 403,
                erro: 'Acesso negado: a conta do terapeuta encontra-se inativa.',
              };
            }

            // Consulta paciente para verificar clínica
            const { data: paciente, error: errPaciente } = await supabase
              .from('paciente')
              .select('id, clinica_id, status_ativo')
              .eq('id', sessao.paciente_id)
              .maybeSingle();

            if (errPaciente || !paciente) {
              return {
                sucesso: false,
                status: 404,
                erro: 'Paciente vinculado à sessão não encontrado.',
              };
            }

            // Bloqueio institucional entre clínicas distintas (RN04)
            if (paciente.clinica_id && terapeutaReq.clinica_id && paciente.clinica_id !== terapeutaReq.clinica_id) {
              return {
                sucesso: false,
                status: 403,
                erro: 'Acesso negado: o terapeuta pertence a uma instituição clínica diferente da do paciente.',
              };
            }

            // Verificação de vínculo ativo na tabela terapeuta_paciente (RN04)
            const { data: vinculo, error: errVinculo } = await supabase
              .from('terapeuta_paciente')
              .select('paciente_id')
              .eq('terapeuta_id', terapeutaReq.id)
              .eq('paciente_id', sessao.paciente_id)
              .maybeSingle();

            if (errVinculo || !vinculo) {
              return {
                sucesso: false,
                status: 403,
                erro: 'Acesso negado: o terapeuta não possui vínculo ativo com este paciente.',
              };
            }
          }
        }
      }

      // 5. Cálculo preciso da duração da sessão em segundos
      let duracaoSegundos = 0;
      if (sessao.data_hora_inicio && sessao.data_hora_fim) {
        const inicioMs = new Date(sessao.data_hora_inicio).getTime();
        const fimMs = new Date(sessao.data_hora_fim).getTime();
        duracaoSegundos = Math.max(0, Math.floor((fimMs - inicioMs) / 1000));
      }

      // 6. Tratamento de Sessão em Modo Livre (RN01: Sem Persistência em Prontuário / Sem Dados Clínicos)
      if (sessao.modo_sessao === MODO_SESSAO.MODO_LIVRE || !sessao.paciente_id) {
        const [jogoRes, terapeutaRes] = await Promise.all([
          supabase.from('jogo').select('id, nome, versao, descricao').eq('id', sessao.jogo_id).maybeSingle(),
          supabase.from('terapeuta').select('id, nome, crefito, registro_profissional').eq('id', sessao.terapeuta_id).maybeSingle(),
        ]);

        return {
          sucesso: true,
          status: 200,
          dados: {
            sessao: {
              id: sessao.id,
              session_token: sessao.session_token,
              modo_sessao: 'modo_livre',
              status_sessao: sessao.status_sessao,
              data_hora_inicio: sessao.data_hora_inicio,
              data_hora_fim: sessao.data_hora_fim,
              duracao_segundos: duracaoSegundos,
              dispositivo_info: (sessao.dispositivo_info as Record<string, unknown>) || null,
            },
            jogo: jogoRes.data as SessaoResultadoJogo | null,
            terapeuta: terapeutaRes.data as SessaoResultadoTerapeuta | null,
            paciente: null,
            relatorio: null,
            anotacoes: [],
          },
        };
      }

      // 7. Consolidação de Sessão Clínica: Busca concorrente e paralela das entidades
      const [relatorioRes, jogoRes, terapeutaRes, pacienteRes, anotacoesRes] = await Promise.all([
        RelatorioSessaoModel.buscarPorSessaoId(sessao.id),
        supabase.from('jogo').select('id, nome, versao, descricao').eq('id', sessao.jogo_id).maybeSingle(),
        supabase.from('terapeuta').select('id, nome, crefito, registro_profissional').eq('id', sessao.terapeuta_id).maybeSingle(),
        supabase.from('paciente').select('id, nome, data_nascimento, cpf').eq('id', sessao.paciente_id).maybeSingle(),
        AnotacaoClinicaModel.listarPorSessao(sessao.id),
      ]);

      // Montagem do bloco de relatório (Contrato 4)
      let relatorioConsolidado: { conteudo: string | null; dados_ia_json: RelatorioIAContrato } | null = null;

      if (relatorioRes && relatorioRes.dados_ia_json) {
        relatorioConsolidado = {
          conteudo: relatorioRes.conteudo,
          dados_ia_json: relatorioRes.dados_ia_json,
        };
      } else {
        // Fallback dinâmico para sessões que ainda não persistiram em relatorio_sessao
        const relatorioSintetizado = SessaoTokenService.gerarRelatorioIA(sessao);
        if (relatorioSintetizado) {
          relatorioConsolidado = {
            conteudo: null,
            dados_ia_json: relatorioSintetizado,
          };
        }
      }

      // Montagem do bloco de anotações
      const anotacoesMapeadas: SessaoResultadoAnotacaoItem[] = (anotacoesRes || []).map((a) => ({
        id: a.id,
        terapeuta_id: a.terapeuta_id,
        conteudo: a.conteudo,
        created_at: a.created_at,
      }));

      return {
        sucesso: true,
        status: 200,
        dados: {
          sessao: {
            id: sessao.id,
            session_token: sessao.session_token,
            modo_sessao: 'sessao_clinica',
            status_sessao: sessao.status_sessao,
            data_hora_inicio: sessao.data_hora_inicio,
            data_hora_fim: sessao.data_hora_fim,
            duracao_segundos: duracaoSegundos,
            dispositivo_info: (sessao.dispositivo_info as Record<string, unknown>) || null,
          },
          jogo: jogoRes.data as SessaoResultadoJogo | null,
          terapeuta: terapeutaRes.data as SessaoResultadoTerapeuta | null,
          paciente: pacienteRes.data as SessaoResultadoPaciente | null,
          relatorio: relatorioConsolidado,
          anotacoes: anotacoesMapeadas,
        },
      };
    } catch (error) {
      console.error('[SessaoResultadoService.obterResultadoConsolidado] Erro inesperado:', error);
      return {
        sucesso: false,
        status: 500,
        erro: 'Erro interno ao consultar resultado consolidado da sessão.',
      };
    }
  }
}
