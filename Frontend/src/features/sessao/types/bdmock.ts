/**
 * ============================================================================
 * FIXTURES E MOCKS EM MEMÓRIA DO DOMÍNIO SESSÃO (bdmock.ts)
 * Simulação de sessões clínicas, pareamento remoto (PIN/Token),
 * sessões em Modo Livre (RN01), telemetria agregada e laudos de IA.
 * ============================================================================
 */

import type {
  Sessao,
  IniciarSessaoDTO,
  FinalizarSessaoDTO,
  StatusSessaoDTO,
  ResultadoSessao,
  MetricasConsolidadas,
  RelatorioIAResultado,
  AnotacaoClinicaResultado,
  FiltroSessaoDTO,
  RespostaListagemSessao,
} from "./sessao.types";

export const MOCK_RELATORIO_IA: RelatorioIAResultado = {
  token_sessao: "849-291",
  duracao_segundos: 1200,
  resumo: {
    taxa_conclusao: 92,
    intervencoes_dda: 3,
  },
  analises_ia: [
    "Paciente demonstrou excelente sustentação atencional no jogo Aventura das Cores.",
    "O motor DDA atuou preventivamente atenuando estímulos sonoros no minuto 04:30.",
    "Recomenda-se avançar progressivamente para desafios de pareamento de maior complexidade.",
  ],
  metricas_agregadas: [
    { id_metrica: "tempo_foco", valor_dominante: "alto", tendencia: "crescente" },
    { id_metrica: "acertos_sequencia", valor_dominante: 45, tendencia: "estavel" },
    { id_metrica: "estabilidade_sensorial", valor_dominante: "excelente", tendencia: "estavel" },
  ],
};

export const MOCK_METRICAS_CONSOLIDADAS: MetricasConsolidadas = {
  duracao_segundos: 1200,
  taxa_conclusao: 92,
  intervencoes_dda: 3,
  pontuacao_geral: 950,
  estabilidade_foco: 88,
  tempo_medio_resposta_ms: 650,
  total_acertos: 45,
  total_erros: 4,
};

export const MOCK_ANOTACOES_RESULTADO: AnotacaoClinicaResultado[] = [
  {
    id: "anot-res-001",
    conteudo:
      "Paciente Lucas participou ativamente da intervenção. Respondeu prontamente aos reforços positivos e não demonstrou sinais de fadiga ou estresse sensorial.",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    registro_profissional: "CREFITO-14/12345-TO",
    sessao_id: "uuid-sessao-1",
    paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    created_at: "2026-10-17T18:25:00.000Z",
    updated_at: "2026-10-17T18:25:00.000Z",
  },
];

export const MOCK_RESULTADO_SESSAO: ResultadoSessao = {
  id: "uuid-sessao-1",
  session_token: "849-291",
  status_sessao: "finalizada",
  data_hora_inicio: "2026-10-17T18:00:00.000Z",
  data_hora_fim: "2026-10-17T18:20:00.000Z",
  duracao_segundos: 1200,
  is_modo_livre: false,
  paciente: {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    nome: "Lucas Gabriel Silveira",
    data_nascimento: "2018-05-14",
    diagnostico: "Transtorno do Espectro Autista (F84.0) - Nível 2",
  },
  jogo: {
    id: "jogo-1",
    titulo: "Aventura das Cores",
    categoria: "Atenção Compartilhada",
  },
  terapeuta: {
    id: "a9849163-613f-4492-90cf-89985902d16e",
    nome: "Dr. Marcos Terapeuta",
    registro_profissional: "CREFITO-14/12345-TO",
  },
  metricas_consolidadas: MOCK_METRICAS_CONSOLIDADAS,
  dados_ia: MOCK_RELATORIO_IA,
  anotacoes: MOCK_ANOTACOES_RESULTADO,
};

export const MOCK_SESSAO_ATIVA: Sessao = {
  id: "uuid-sessao-1",
  terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
  paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  jogo_id: "jogo-1",
  session_token: "849-291",
  modo_sessao: "sessao_clinica",
  status_sessao: "em_andamento",
  contexto_dda_json: {
    estresse_inicial: 2,
    gatilhos_a_evitar: ["Sons Repentinos e Ruídos Agudos"],
    objetivo_clinico: "Atenção Compartilhada",
    sensibilidade_sensorial: "moderada",
  },
  dispositivo_info: {
    tipo_dispositivo: "tablet",
    modelo: "Samsung Galaxy Tab S9 FE",
    bateria: 85,
    latencia_ms: 18,
    conectado: true,
    resolucao: "2304x1440",
    sistema_operacional: "Android 14",
    ultimo_heartbeat: "2026-10-17T18:15:00.000Z",
  },
  data_hora_inicio: "2026-10-17T18:00:00.000Z",
  data_hora_fim: null,
  expira_em: "2026-10-17T18:30:00.000Z",
  created_at: "2026-10-17T17:58:00.000Z",
  updated_at: "2026-10-17T18:15:00.000Z",
  is_modo_livre: false,
  jogo: {
    id: "jogo-1",
    titulo: "Aventura das Cores",
    nome: "Aventura das Cores",
    versao: "1.2",
    categoria: "Atenção Compartilhada",
  },
  paciente: {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    nome: "Lucas Gabriel Silveira",
    diagnostico: "Transtorno do Espectro Autista (F84.0) - Nível 2",
  },
  terapeuta: {
    id: "a9849163-613f-4492-90cf-89985902d16e",
    nome: "Dr. Marcos Terapeuta",
    registro_profissional: "CREFITO-14/12345-TO",
  },
};

export const MOCK_SESSAO_FINALIZADA: Sessao = {
  id: "uuid-sessao-2",
  terapeuta_id: "b3333333-3333-4333-8333-333333333333",
  paciente_id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  jogo_id: "jogo-2",
  session_token: "333-444",
  modo_sessao: "sessao_clinica",
  status_sessao: "finalizada",
  contexto_dda_json: {
    estresse_inicial: 1,
    gatilhos_a_evitar: ["Luzes Estroboscópicas e Luz Branca Fria"],
    objetivo_clinico: "Regulação Sensorial",
  },
  dispositivo_info: {
    tipo_dispositivo: "vr",
    modelo: "Meta Quest 3",
    bateria: 70,
    latencia_ms: 12,
    conectado: false,
  },
  data_hora_inicio: "2026-10-17T16:00:00.000Z",
  data_hora_fim: "2026-10-17T16:25:00.000Z",
  expira_em: "2026-10-17T16:30:00.000Z",
  created_at: "2026-10-17T15:55:00.000Z",
  updated_at: "2026-10-17T16:25:00.000Z",
  is_modo_livre: false,
  jogo: {
    id: "jogo-2",
    titulo: "Formas Calmas",
    nome: "Formas Calmas",
    versao: "2.0",
  },
  paciente: {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    nome: "Sofia Costa Santos",
    diagnostico: "Transtorno do Espectro Autista (F84.0) - Nível 1",
  },
  terapeuta: {
    id: "b3333333-3333-4333-8333-333333333333",
    nome: "Dra. Luma Maiara",
    registro_profissional: "CRP-21/04567",
  },
};

export const MOCK_SESSAO_MODO_LIVRE: Sessao = {
  id: "uuid-sessao-livre",
  terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
  paciente_id: null,
  jogo_id: "jogo-1",
  session_token: "555-666",
  modo_sessao: "modo_livre",
  status_sessao: "finalizada",
  is_modo_livre: true,
  data_hora_inicio: "2026-10-17T14:00:00.000Z",
  data_hora_fim: "2026-10-17T14:15:00.000Z",
  expira_em: "2026-10-17T14:30:00.000Z",
  created_at: "2026-10-17T13:58:00.000Z",
  updated_at: "2026-10-17T14:15:00.000Z",
  paciente: null,
  jogo: {
    id: "jogo-1",
    titulo: "Aventura das Cores",
    nome: "Aventura das Cores",
    versao: "1.2",
  },
};

export const MOCK_SESSAO_AGUARDANDO: Sessao = {
  id: "uuid-sessao-aguardando",
  terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
  paciente_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  jogo_id: "jogo-1",
  session_token: "777-888",
  modo_sessao: "sessao_clinica",
  status_sessao: "aguardando_pareamento",
  data_hora_inicio: "2026-10-17T19:00:00.000Z",
  data_hora_fim: null,
  expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  dispositivo_info: null,
  paciente: {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    nome: "Lucas Gabriel Silveira",
  },
  jogo: {
    id: "jogo-1",
    titulo: "Aventura das Cores",
  },
};

export const FIXTURES_SESSOES: Sessao[] = [
  MOCK_SESSAO_ATIVA,
  MOCK_SESSAO_FINALIZADA,
  MOCK_SESSAO_MODO_LIVRE,
  MOCK_SESSAO_AGUARDANDO,
];

let sessoesMockState: Sessao[] = JSON.parse(JSON.stringify(FIXTURES_SESSOES));

export function resetarSessoesMock(): void {
  sessoesMockState = JSON.parse(JSON.stringify(FIXTURES_SESSOES));
}

/**
 * Creates or initializes a new session in memory.
 */
export async function iniciarSessaoMock(
  dto: IniciarSessaoDTO,
): Promise<Sessao> {
  const novoId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sess-${Date.now()}`;

  const token =
    dto.session_token ||
    dto.codigo_pareamento ||
    `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;

  const isModoLivre = dto.modo_sessao === "modo_livre";
  const agora = new Date().toISOString();
  const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const novaSessao: Sessao = {
    id: novoId,
    terapeuta_id: dto.terapeuta_id || "a9849163-613f-4492-90cf-89985902d16e",
    paciente_id: isModoLivre ? null : (dto.paciente_id || null),
    jogo_id: dto.jogo_id,
    session_token: token,
    modo_sessao: dto.modo_sessao || "sessao_clinica",
    status_sessao: dto.status_sessao || "aguardando_pareamento",
    contexto_dda_json: isModoLivre ? undefined : dto.contexto_dda_json,
    dispositivo_info: (dto.dispositivo_info as unknown as Sessao["dispositivo_info"]) || null,
    data_hora_inicio: agora,
    data_hora_fim: null,
    expira_em: expira,
    created_at: agora,
    updated_at: agora,
    is_modo_livre: isModoLivre,
    jogo: {
      id: dto.jogo_id,
      titulo: dto.jogo_id === "jogo-2" ? "Formas Calmas" : "Aventura das Cores",
    },
  };

  sessoesMockState.push(novaSessao);
  return JSON.parse(JSON.stringify(novaSessao));
}

/**
 * Retrieves session by UUID.
 */
export async function buscarSessaoMockPorId(
  id: string,
): Promise<Sessao | null> {
  const encontrada = sessoesMockState.find((s) => s.id === id);
  return encontrada ? JSON.parse(JSON.stringify(encontrada)) : null;
}

/**
 * Retrieves a session by pairing token/PIN.
 */
export async function buscarSessaoMockPorToken(
  token: string,
): Promise<Sessao | null> {
  const encontrada = sessoesMockState.find(
    (s) => s.session_token === token || s.id === token,
  );
  return encontrada ? JSON.parse(JSON.stringify(encontrada)) : null;
}

/**
 * Queries connection and pairing status of a session.
 */
export async function consultarStatusMock(
  idOuToken: string,
): Promise<StatusSessaoDTO | null> {
  const sessao = await buscarSessaoMockPorToken(idOuToken);
  if (!sessao) return null;

  const expirado = sessao.expira_em
    ? new Date(sessao.expira_em).getTime() < Date.now()
    : false;

  const statusDTO: StatusSessaoDTO = {
    id: sessao.id,
    session_token: sessao.session_token,
    status_sessao: sessao.status_sessao,
    modo_sessao: sessao.modo_sessao,
    dispositivo_conectado: Boolean(sessao.dispositivo_info?.conectado),
    dispositivo_info: sessao.dispositivo_info ?? null,
    expirado,
    tempo_restante_segundos: expirado ? 0 : 900,
  };

  return statusDTO;
}

/**
 * Updates session state machine status.
 */
export async function atualizarStatusSessaoMock(
  id: string,
  status: string,
): Promise<Sessao | null> {
  const index = sessoesMockState.findIndex(
    (s) => s.id === id || s.session_token === id,
  );
  if (index === -1) return null;

  const atualizada: Sessao = {
    ...sessoesMockState[index],
    status_sessao: status,
    updated_at: new Date().toISOString(),
  };

  sessoesMockState[index] = atualizada;
  return JSON.parse(JSON.stringify(atualizada));
}

/**
 * Concludes clinical session and generates consolidated AI outcome (RF13, RF14).
 */
export async function finalizarSessaoMock(
  id: string,
  dto?: FinalizarSessaoDTO | string,
): Promise<ResultadoSessao> {
  const index = sessoesMockState.findIndex(
    (s) => s.id === id || s.session_token === id,
  );

  const agora = new Date().toISOString();
  let sessaoBase = MOCK_SESSAO_ATIVA;

  if (index !== -1) {
    const atualizada: Sessao = {
      ...sessoesMockState[index],
      status_sessao: "finalizada",
      data_hora_fim: agora,
      updated_at: agora,
    };
    sessoesMockState[index] = atualizada;
    sessaoBase = atualizada;
  }

  const anotacaoTexto =
    typeof dto === "string"
      ? dto
      : dto?.anotacoes_clinicas || "Sessão finalizada com sucesso.";

  const resultado: ResultadoSessao = {
    id: sessaoBase.id,
    session_token: sessaoBase.session_token,
    status_sessao: "finalizada",
    data_hora_inicio: sessaoBase.data_hora_inicio,
    data_hora_fim: agora,
    duracao_segundos: 1200,
    is_modo_livre: sessaoBase.is_modo_livre || false,
    paciente: sessaoBase.paciente,
    jogo: sessaoBase.jogo
      ? { id: sessaoBase.jogo.id, titulo: sessaoBase.jogo.titulo || "Jogo InTEA" }
      : null,
    terapeuta: sessaoBase.terapeuta,
    metricas_consolidadas: MOCK_METRICAS_CONSOLIDADAS,
    dados_ia: MOCK_RELATORIO_IA,
    anotacoes: [
      {
        id: "anot-fim-001",
        conteudo: anotacaoTexto,
        terapeuta_id: sessaoBase.terapeuta_id,
        sessao_id: sessaoBase.id,
        paciente_id: sessaoBase.paciente_id || undefined,
        created_at: agora,
      },
    ],
  };

  return JSON.parse(JSON.stringify(resultado));
}

/**
 * Cancels session in progress or awaiting pairing.
 */
export async function cancelarSessaoMock(
  id: string,
  _motivo?: string,
): Promise<Sessao | null> {
  return atualizarStatusSessaoMock(id, "cancelada");
}

/**
 * Returns consolidated outcomes of a completed session.
 */
export async function obterResultadoSessaoMock(
  id: string,
): Promise<ResultadoSessao | null> {
  if (
    id === MOCK_RESULTADO_SESSAO.id ||
    id === MOCK_RESULTADO_SESSAO.session_token ||
    id === MOCK_SESSAO_ATIVA.id ||
    id === MOCK_SESSAO_ATIVA.session_token
  ) {
    return JSON.parse(JSON.stringify(MOCK_RESULTADO_SESSAO));
  }

  const sessao = await buscarSessaoMockPorId(id);
  if (!sessao) return null;

  return {
    ...MOCK_RESULTADO_SESSAO,
    id: sessao.id,
    session_token: sessao.session_token,
    paciente: sessao.paciente,
    jogo: sessao.jogo
      ? { id: sessao.jogo.id, titulo: sessao.jogo.titulo || "Jogo InTEA" }
      : null,
  };
}

/**
 * Exports clinical report in structured format (RF20).
 */
export async function exportarRelatorioSessaoMock(
  id: string,
): Promise<{
  sessao_id: string;
  clinica: string;
  paciente: string;
  relatorio_gerado_em: string;
  resultado: ResultadoSessao;
}> {
  const resultado =
    (await obterResultadoSessaoMock(id)) || MOCK_RESULTADO_SESSAO;

  return {
    sessao_id: id,
    clinica: "Clínica Escola InTEA - UFPI",
    paciente: resultado.paciente?.nome || "Modo Livre",
    relatorio_gerado_em: new Date().toISOString(),
    resultado,
  };
}

/**
 * Lists mock sessions in memory applying clinical and pagination filters.
 */
export async function listarSessoesMock(
  filtros?: FiltroSessaoDTO,
): Promise<RespostaListagemSessao<Sessao>> {
  let resultado = [...sessoesMockState];

  if (filtros?.pacienteId) {
    resultado = resultado.filter((s) => s.paciente_id === filtros.pacienteId);
  }

  if (filtros?.status) {
    const s = filtros.status.toLowerCase().trim();
    if (s === "concluida" || s === "concluidas" || s === "finalizada" || s === "completo") {
      resultado = resultado.filter((item) => item.status_sessao === "finalizada");
    } else if (s === "cancelada" || s === "canceladas") {
      resultado = resultado.filter((item) => item.status_sessao === "cancelada");
    } else if (s === "falha") {
      resultado = resultado.filter((item) =>
        ["cancelada", "expirada", "interrompida_por_queda"].includes(item.status_sessao)
      );
    } else if (s === "pendente" || s === "pendentes" || s === "incompleto") {
      resultado = resultado.filter((item) =>
        ["aguardando_pareamento", "conectado", "em_andamento"].includes(item.status_sessao)
      );
    }
  }

  if (filtros?.data) {
    resultado = resultado.filter((item) =>
      item.data_hora_inicio?.startsWith(filtros.data!)
    );
  }

  // Ordenação decrescente por data_hora_inicio
  resultado.sort((a, b) => {
    const da = a.data_hora_inicio ? new Date(a.data_hora_inicio).getTime() : 0;
    const db = b.data_hora_inicio ? new Date(b.data_hora_inicio).getTime() : 0;
    return db - da;
  });

  const rawPage = Number(filtros?.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawLimit = Number(filtros?.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 10;
  const total = resultado.length;
  const totalPages = Math.ceil(total / limit) || 0;
  const offset = (page - 1) * limit;
  const data = resultado.slice(offset, offset + limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
