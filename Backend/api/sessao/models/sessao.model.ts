import { supabase } from '../../../core/supabase/supabase.client.js';
import { CriarSessaoDTO, DispositivoInfoDTO } from '../dtos/sessao.dto.js';

export type StatusSessao = 'aguardando_conexao' | 'em_andamento' | 'finalizada' | 'cancelada';
export type ModoSessao = 'sessao_clinica' | 'modo_livre';

export interface SessaoJogoRelacionado {
  id: string;
  nome: string;
  versao: string;
}

export interface Sessao {
  id: string;
  terapeuta_id: string;
  paciente_id: string | null;
  jogo_id: string;
  session_token: string;
  modo_sessao: ModoSessao;
  contexto_dda_json: Record<string, unknown>;
  status_sessao: StatusSessao;
  dispositivo_info?: DispositivoInfoDTO | null;
  expira_em?: string | null;
  data_hora_inicio: string;
  data_hora_fim?: string | null;
  created_at: string;
  jogo?: SessaoJogoRelacionado;
}

export class SessaoModel {
  // Base de dados em memória para testes offline e desenvolvimento sem banco ativo
  private static mockSessoes: Sessao[] = [
    {
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      jogo_id: '11111111-2222-3333-4444-555555555555',
      session_token: '849-291',
      modo_sessao: 'sessao_clinica',
      contexto_dda_json: {
        nivel_estresse_inicial: 2,
        gatilhos_a_evitar: ['som_alto'],
        objetivo_clinico: 'Foco Atencional'
      },
      status_sessao: 'aguardando_conexao',
      dispositivo_info: null,
      expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Válido por 15 min
      data_hora_inicio: new Date().toISOString(),
      created_at: new Date().toISOString(),
      jogo: {
        id: '11111111-2222-3333-4444-555555555555',
        nome: 'Aventura das Cores',
        versao: '1.2.0'
      }
    },
    {
      id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      jogo_id: '11111111-2222-3333-4444-555555555555',
      session_token: 'EXP-001',
      modo_sessao: 'sessao_clinica',
      contexto_dda_json: {},
      status_sessao: 'aguardando_conexao',
      dispositivo_info: null,
      expira_em: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // Expirado há 10 min
      data_hora_inicio: new Date().toISOString(),
      created_at: new Date().toISOString(),
      jogo: {
        id: '11111111-2222-3333-4444-555555555555',
        nome: 'Aventura das Cores',
        versao: '1.2.0'
      }
    },
    {
      id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
      terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      jogo_id: '11111111-2222-3333-4444-555555555555',
      session_token: 'AND-002',
      modo_sessao: 'sessao_clinica',
      contexto_dda_json: {},
      status_sessao: 'em_andamento',
      dispositivo_info: {
        tipo_dispositivo: 'tablet',
        modelo: 'iPad 10th Gen'
      },
      expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      data_hora_inicio: new Date().toISOString(),
      created_at: new Date().toISOString(),
      jogo: {
        id: '11111111-2222-3333-4444-555555555555',
        nome: 'Aventura das Cores',
        versao: '1.2.0'
      }
    },
    {
      id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
      terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      jogo_id: '11111111-2222-3333-4444-555555555555',
      session_token: 'FIN-003',
      modo_sessao: 'sessao_clinica',
      contexto_dda_json: {},
      status_sessao: 'finalizada',
      dispositivo_info: null,
      expira_em: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      data_hora_inicio: new Date().toISOString(),
      data_hora_fim: new Date().toISOString(),
      created_at: new Date().toISOString(),
      jogo: {
        id: '11111111-2222-3333-4444-555555555555',
        nome: 'Aventura das Cores',
        versao: '1.2.0'
      }
    },
    {
      id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
      terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      paciente_id: null,
      jogo_id: '11111111-2222-3333-4444-555555555555',
      session_token: 'CNC-004',
      modo_sessao: 'modo_livre',
      contexto_dda_json: {},
      status_sessao: 'cancelada',
      dispositivo_info: null,
      expira_em: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      data_hora_inicio: new Date().toISOString(),
      created_at: new Date().toISOString(),
      jogo: {
        id: '11111111-2222-3333-4444-555555555555',
        nome: 'Aventura das Cores',
        versao: '1.2.0'
      }
    }
  ];

  /**
   * Reseta o banco em memória para o estado inicial (útil para suítes de testes).
   */
  static resetarMock(): void {
    SessaoModel.mockSessoes = [
      {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        jogo_id: '11111111-2222-3333-4444-555555555555',
        session_token: '849-291',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {
          nivel_estresse_inicial: 2,
          gatilhos_a_evitar: ['som_alto'],
          objetivo_clinico: 'Foco Atencional'
        },
        status_sessao: 'aguardando_conexao',
        dispositivo_info: null,
        expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        data_hora_inicio: new Date().toISOString(),
        created_at: new Date().toISOString(),
        jogo: {
          id: '11111111-2222-3333-4444-555555555555',
          nome: 'Aventura das Cores',
          versao: '1.2.0'
        }
      },
      {
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        jogo_id: '11111111-2222-3333-4444-555555555555',
        session_token: 'EXP-001',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'aguardando_conexao',
        dispositivo_info: null,
        expira_em: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        data_hora_inicio: new Date().toISOString(),
        created_at: new Date().toISOString(),
        jogo: {
          id: '11111111-2222-3333-4444-555555555555',
          nome: 'Aventura das Cores',
          versao: '1.2.0'
        }
      },
      {
        id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
        terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        jogo_id: '11111111-2222-3333-4444-555555555555',
        session_token: 'AND-002',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'em_andamento',
        dispositivo_info: {
          tipo_dispositivo: 'tablet',
          modelo: 'iPad 10th Gen'
        },
        expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        data_hora_inicio: new Date().toISOString(),
        created_at: new Date().toISOString(),
        jogo: {
          id: '11111111-2222-3333-4444-555555555555',
          nome: 'Aventura das Cores',
          versao: '1.2.0'
        }
      },
      {
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
        terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        paciente_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        jogo_id: '11111111-2222-3333-4444-555555555555',
        session_token: 'FIN-003',
        modo_sessao: 'sessao_clinica',
        contexto_dda_json: {},
        status_sessao: 'finalizada',
        dispositivo_info: null,
        expira_em: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        data_hora_inicio: new Date().toISOString(),
        data_hora_fim: new Date().toISOString(),
        created_at: new Date().toISOString(),
        jogo: {
          id: '11111111-2222-3333-4444-555555555555',
          nome: 'Aventura das Cores',
          versao: '1.2.0'
        }
      },
      {
        id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
        terapeuta_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        paciente_id: null,
        jogo_id: '11111111-2222-3333-4444-555555555555',
        session_token: 'CNC-004',
        modo_sessao: 'modo_livre',
        contexto_dda_json: {},
        status_sessao: 'cancelada',
        dispositivo_info: null,
        expira_em: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        data_hora_inicio: new Date().toISOString(),
        created_at: new Date().toISOString(),
        jogo: {
          id: '11111111-2222-3333-4444-555555555555',
          nome: 'Aventura das Cores',
          versao: '1.2.0'
        }
      }
    ];
  }

  private static isSupabaseAvailable(): boolean {
    const url = process.env.SUPABASE_URL;
    return Boolean(url && !url.includes('placeholder') && !url.includes('your-project'));
  }

  /**
   * Busca uma sessão ativa pelo session_token (normalizando formatação com ou sem hífen).
   *
   * @param token - Token alfanumérico ou formatado informado pelo dispositivo.
   * @returns A entidade Sessao encontrada ou null se não existir.
   */
  static async buscarPorToken(token: string): Promise<Sessao | null> {
    const tokenLimpo = token.trim().toUpperCase();
    const tokenSemHifen = tokenLimpo.replace(/[^A-Z0-9]/g, '');

    if (SessaoModel.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('sessao')
        .select(`
          id,
          terapeuta_id,
          paciente_id,
          jogo_id,
          session_token,
          modo_sessao,
          contexto_dda_json,
          status_sessao,
          dispositivo_info,
          expira_em,
          data_hora_inicio,
          data_hora_fim,
          created_at,
          jogo:jogo_id (
            id,
            nome,
            versao
          )
        `)
        .eq('session_token', tokenLimpo)
        .maybeSingle();

      if (!error && data) {
        const sessaoData = data as unknown as Record<string, unknown>;
        const jogoRel = sessaoData.jogo as unknown as SessaoJogoRelacionado | null;
        return {
          id: String(sessaoData.id),
          terapeuta_id: String(sessaoData.terapeuta_id),
          paciente_id: sessaoData.paciente_id ? String(sessaoData.paciente_id) : null,
          jogo_id: String(sessaoData.jogo_id),
          session_token: String(sessaoData.session_token),
          modo_sessao: sessaoData.modo_sessao as ModoSessao,
          contexto_dda_json: (sessaoData.contexto_dda_json as Record<string, unknown>) || {},
          status_sessao: sessaoData.status_sessao as StatusSessao,
          dispositivo_info: (sessaoData.dispositivo_info as DispositivoInfoDTO) || null,
          expira_em: sessaoData.expira_em ? String(sessaoData.expira_em) : null,
          data_hora_inicio: String(sessaoData.data_hora_inicio),
          data_hora_fim: sessaoData.data_hora_fim ? String(sessaoData.data_hora_fim) : null,
          created_at: String(sessaoData.created_at),
          jogo: jogoRel || undefined
        };
      }
      } catch {
        // Ignora erro de Supabase não configurado e executa fallback
      }
    }

    // Fallback em memória
    const encontrada = SessaoModel.mockSessoes.find((s) => {
      const sTokenLimpo = s.session_token.trim().toUpperCase();
      const sTokenSemHifen = sTokenLimpo.replace(/[^A-Z0-9]/g, '');
      return sTokenLimpo === tokenLimpo || sTokenSemHifen === tokenSemHifen;
    });

    return encontrada ? { ...encontrada } : null;
  }

  /**
   * Busca uma sessão pelo ID primário (UUID).
   *
   * @param id - Identificador UUID da sessão.
   */
  static async buscarPorId(id: string): Promise<Sessao | null> {
    if (SessaoModel.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('sessao')
          .select(`
            id,
            terapeuta_id,
            paciente_id,
            jogo_id,
            session_token,
            modo_sessao,
            contexto_dda_json,
            status_sessao,
            dispositivo_info,
            expira_em,
            data_hora_inicio,
            data_hora_fim,
            created_at,
            jogo:jogo_id (
              id,
              nome,
              versao
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const sessaoData = data as unknown as Record<string, unknown>;
          const jogoRel = sessaoData.jogo as unknown as SessaoJogoRelacionado | null;
          return {
            id: String(sessaoData.id),
            terapeuta_id: String(sessaoData.terapeuta_id),
            paciente_id: sessaoData.paciente_id ? String(sessaoData.paciente_id) : null,
            jogo_id: String(sessaoData.jogo_id),
            session_token: String(sessaoData.session_token),
            modo_sessao: sessaoData.modo_sessao as ModoSessao,
            contexto_dda_json: (sessaoData.contexto_dda_json as Record<string, unknown>) || {},
            status_sessao: sessaoData.status_sessao as StatusSessao,
            dispositivo_info: (sessaoData.dispositivo_info as DispositivoInfoDTO) || null,
            expira_em: sessaoData.expira_em ? String(sessaoData.expira_em) : null,
            data_hora_inicio: String(sessaoData.data_hora_inicio),
            data_hora_fim: sessaoData.data_hora_fim ? String(sessaoData.data_hora_fim) : null,
            created_at: String(sessaoData.created_at),
            jogo: jogoRel || undefined
          };
        }
      } catch {
        // Ignora erro de Supabase não configurado
      }
    }

    const sessaoMock = SessaoModel.mockSessoes.find((s) => s.id === id);
    return sessaoMock ? { ...sessaoMock } : null;
  }

  /**
   * Conclui o aperto de mão (handshake) do pareamento remoto:
   * Atualiza a sessão para o status 'em_andamento', grava metadados do dispositivo e ajusta o timestamp.
   *
   * @param sessaoId - Identificador UUID da sessão a ser pareada.
   * @param dispositivoInfo - Metadados técnicos do dispositivo externo conectado (tablet/VR/desktop).
   * @returns A entidade Sessao atualizada.
   */
  static async parearDispositivo(
    sessaoId: string,
    dispositivoInfo?: DispositivoInfoDTO
  ): Promise<Sessao> {
    const payloadAtualizacao = {
      status_sessao: 'em_andamento',
      dispositivo_info: dispositivoInfo || {},
      data_hora_inicio: new Date().toISOString()
    };

    if (SessaoModel.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('sessao')
          .update(payloadAtualizacao)
          .eq('id', sessaoId)
          .select(`
            id,
            terapeuta_id,
            paciente_id,
            jogo_id,
            session_token,
            modo_sessao,
            contexto_dda_json,
            status_sessao,
            dispositivo_info,
            expira_em,
            data_hora_inicio,
            data_hora_fim,
            created_at,
            jogo:jogo_id (
              id,
              nome,
              versao
            )
          `)
          .single();

        if (!error && data) {
          const sessaoData = data as unknown as Record<string, unknown>;
          const jogoRel = sessaoData.jogo as unknown as SessaoJogoRelacionado | null;
          return {
            id: String(sessaoData.id),
            terapeuta_id: String(sessaoData.terapeuta_id),
            paciente_id: sessaoData.paciente_id ? String(sessaoData.paciente_id) : null,
            jogo_id: String(sessaoData.jogo_id),
            session_token: String(sessaoData.session_token),
            modo_sessao: sessaoData.modo_sessao as ModoSessao,
            contexto_dda_json: (sessaoData.contexto_dda_json as Record<string, unknown>) || {},
            status_sessao: 'em_andamento',
            dispositivo_info: dispositivoInfo || null,
            expira_em: sessaoData.expira_em ? String(sessaoData.expira_em) : null,
            data_hora_inicio: String(sessaoData.data_hora_inicio),
            data_hora_fim: sessaoData.data_hora_fim ? String(sessaoData.data_hora_fim) : null,
            created_at: String(sessaoData.created_at),
            jogo: jogoRel || undefined
          };
        }
      } catch {
        // Ignora erro de Supabase não configurado e atualiza no mock
      }
    }

    // Atualiza no mock em memória
    const idx = SessaoModel.mockSessoes.findIndex((s) => s.id === sessaoId);
    if (idx === -1) {
      throw new Error(`Sessão ${sessaoId} não encontrada para pareamento`);
    }

    SessaoModel.mockSessoes[idx] = {
      ...SessaoModel.mockSessoes[idx],
      status_sessao: 'em_andamento',
      dispositivo_info: dispositivoInfo || null,
      data_hora_inicio: new Date().toISOString()
    };

    return { ...SessaoModel.mockSessoes[idx] };
  }

  /**
   * Cria uma nova sessão (útil para suporte ao Card 1.3 e testes de integração).
   *
   * @param dto - Dados de inicialização da sessão.
   */
  static async criar(dto: CriarSessaoDTO): Promise<Sessao> {
    const id = crypto.randomUUID();
    const token = dto.session_token || Math.floor(100000 + Math.random() * 900000).toString().replace(/(\d{3})(\d{3})/, '$1-$2');
    const expiraEm = dto.expira_em || new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const modoSessao = dto.modo_sessao || (dto.paciente_id ? 'sessao_clinica' : 'modo_livre');

    const novaSessao: Sessao = {
      id,
      terapeuta_id: dto.terapeuta_id,
      paciente_id: dto.paciente_id || null,
      jogo_id: dto.jogo_id,
      session_token: token,
      modo_sessao: modoSessao,
      contexto_dda_json: dto.contexto_dda_json || {},
      status_sessao: 'aguardando_conexao',
      dispositivo_info: null,
      expira_em: expiraEm,
      data_hora_inicio: new Date().toISOString(),
      created_at: new Date().toISOString(),
      jogo: {
        id: dto.jogo_id,
        nome: 'Jogo Teste',
        versao: '1.0.0'
      }
    };

    if (SessaoModel.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('sessao')
          .insert({
            id: novaSessao.id,
            terapeuta_id: novaSessao.terapeuta_id,
            paciente_id: novaSessao.paciente_id,
            jogo_id: novaSessao.jogo_id,
            session_token: novaSessao.session_token,
            modo_sessao: novaSessao.modo_sessao,
            contexto_dda_json: novaSessao.contexto_dda_json,
            status_sessao: novaSessao.status_sessao,
            expira_em: novaSessao.expira_em
          })
          .select()
          .single();

        if (!error && data) {
          return novaSessao;
        }
      } catch {
        // Ignora erro de Supabase não configurado
      }
    }

    SessaoModel.mockSessoes.push(novaSessao);
    return { ...novaSessao };
  }

  /**
   * Exclusão física para teardown de testes automatizados (Dev/Test only).
   *
   * @param id - Identificador UUID da sessão a excluir.
   */
  static async deletarHard(id: string): Promise<boolean> {
    if (SessaoModel.isSupabaseAvailable()) {
      try {
        await supabase.from('sessao').delete().eq('id', id);
      } catch {
        // Ignora erro
      }
    }

    const initialLength = SessaoModel.mockSessoes.length;
    SessaoModel.mockSessoes = SessaoModel.mockSessoes.filter((s) => s.id !== id);
    return SessaoModel.mockSessoes.length < initialLength;
  }
}
