// ============================================================================
// SERVIÇO DE AUDITORIA ADMINISTRATIVA (auditoriaAdmin.service.ts)
// Comunicação com endpoints restritos de auditoria (/api/admin/auditoria)
// com fallback em memória resiliente para testes e desenvolvimento offline.
// ============================================================================

import { http, withFallback } from "@/core/api";
import type {
  EventoAuditoria,
  FiltrosAuditoriaDTO,
  RespostaPaginadaAuditoria,
  EstatisticasAuditoria,
} from "../types/admin.types";

/**
 * Extracts normalized relational metadata (`id`, `nome`, `email`) from a nested audit relation object.
 *
 * @param valor - Unknown relational field from an API audit record.
 * @returns Normalized relational summary object, or `null` when unavailable.
 */
function extrairRegistroRelacional(
  valor: unknown
): { id?: string; nome?: string; email?: string } | null {
  if (!valor || typeof valor !== "object") return null;
  const obj = valor as Record<string, unknown>;
  return {
    id: typeof obj.id === "string" ? obj.id : undefined,
    nome: typeof obj.nome === "string" ? obj.nome : undefined,
    email: typeof obj.email === "string" ? obj.email : undefined,
  };
}

/**
 * Normalizes a raw audit event payload from the backend into the canonical `EventoAuditoria` shape.
 *
 * @param raw - Raw audit event record containing nested relations and metadata.
 * @returns Normalized `EventoAuditoria` entry ready for UI rendering and export.
 */
export function normalizarEventoAuditoria(
  raw: Partial<EventoAuditoria> & Record<string, unknown>
): EventoAuditoria {
  const terapeutaRel = extrairRegistroRelacional(raw.terapeuta);
  const pacienteRel = extrairRegistroRelacional(raw.paciente);
  const clinicaRel = extrairRegistroRelacional(raw.clinica);
  const sessaoRel =
    raw.sessao && typeof raw.sessao === "object"
      ? (raw.sessao as Record<string, unknown>)
      : null;
  const sessaoPacienteRel = extrairRegistroRelacional(sessaoRel?.paciente);
  const sessaoJogoRel = extrairRegistroRelacional(sessaoRel?.jogo);

  const terapeutaId =
    typeof raw.terapeuta_id === "string"
      ? raw.terapeuta_id
      : terapeutaRel?.id ?? null;
  const pacienteId =
    typeof raw.paciente_id === "string"
      ? raw.paciente_id
      : pacienteRel?.id ??
        (typeof sessaoRel?.paciente_id === "string"
          ? sessaoRel.paciente_id
          : sessaoPacienteRel?.id ?? null);
  const sessaoId =
    typeof raw.sessao_id === "string"
      ? raw.sessao_id
      : typeof sessaoRel?.id === "string"
        ? sessaoRel.id
        : null;
  const clinicaId =
    typeof raw.clinica_id === "string" ? raw.clinica_id : clinicaRel?.id ?? null;
  const recursoId =
    typeof raw.recurso_id === "string"
      ? raw.recurso_id
      : sessaoId ?? pacienteId ?? terapeutaId ?? null;

  const detalhes =
    raw.detalhes_json && typeof raw.detalhes_json === "object"
      ? (raw.detalhes_json as Record<string, unknown>)
      : {};

  return {
    id: String(raw.id || ""),
    created_at: String(raw.created_at || new Date().toISOString()),
    entidade: typeof raw.entidade === "string" ? raw.entidade : undefined,
    recurso_id: recursoId,
    clinica_id: clinicaId,
    clinica_nome:
      typeof raw.clinica_nome === "string"
        ? raw.clinica_nome
        : clinicaRel?.nome,
    terapeuta_id: terapeutaId,
    terapeuta_nome:
      typeof raw.terapeuta_nome === "string"
        ? raw.terapeuta_nome
        : terapeutaRel?.nome,
    terapeuta_email:
      typeof raw.terapeuta_email === "string"
        ? raw.terapeuta_email
        : terapeutaRel?.email,
    sessao_id: sessaoId,
    paciente_id: pacienteId,
    paciente_nome:
      typeof raw.paciente_nome === "string"
        ? raw.paciente_nome
        : pacienteRel?.nome ?? sessaoPacienteRel?.nome,
    jogo_nome:
      typeof raw.jogo_nome === "string" ? raw.jogo_nome : sessaoJogoRel?.nome,
    origem: typeof raw.origem === "string" ? raw.origem : "terapeuta_web",
    acao: typeof raw.acao === "string" ? raw.acao : "",
    descricao: typeof raw.descricao === "string" ? raw.descricao : undefined,
    ip: typeof raw.ip === "string" && raw.ip.trim() !== "" ? raw.ip.trim() : null,
    user_agent:
      typeof raw.user_agent === "string" && raw.user_agent.trim() !== ""
        ? raw.user_agent
        : null,
    detalhes_json: detalhes,
  };
}

export const MOCK_EVENTOS_AUDITORIA: EventoAuditoria[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    created_at: "2026-10-21T18:15:30.000Z",
    entidade: "sessao",
    recurso_id: "11111111-1111-4111-a111-111111111111",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    terapeuta_email: "marcos.terapeuta@intea.com.br",
    sessao_id: "11111111-1111-4111-a111-111111111111",
    paciente_id: "p1111111-1111-4111-8111-111111111111",
    paciente_nome: "Lucas Gabriel Silva",
    jogo_nome: "Jornada Espacial TEA",
    origem: "terapeuta_web",
    acao: "sessao_finalizada",
    descricao: "Encerramento formal de sessão clínica com persistência do laudo IA.",
    ip: "192.168.1.104",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) InTEA-Client/1.0",
    detalhes_json: {
      duracao_minutos: 25,
      frequencia_cardiaca_media: 82,
      dda_intervencoes_total: 3,
      status_final: "finalizada",
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    created_at: "2026-10-21T18:02:11.000Z",
    entidade: "sessao",
    recurso_id: "11111111-1111-4111-a111-111111111111",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    terapeuta_email: "marcos.terapeuta@intea.com.br",
    sessao_id: "11111111-1111-4111-a111-111111111111",
    paciente_id: "p1111111-1111-4111-8111-111111111111",
    paciente_nome: "Lucas Gabriel Silva",
    jogo_nome: "Jornada Espacial TEA",
    origem: "sistema_dda",
    acao: "intervencao_dda",
    descricao: "Modulação dinâmica de dificuldade: redução de estímulos visuais devido a estresse elevado.",
    ip: "10.0.0.12",
    user_agent: "InTEA-DDA-Engine/2.4",
    detalhes_json: {
      nivel_anterior: 3,
      novo_nivel: 2,
      gatilho: "pico_frequencia_cardiaca",
      frequencia_detectada: 118,
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    created_at: "2026-10-21T17:51:04.000Z",
    entidade: "sessao",
    recurso_id: "11111111-1111-4111-a111-111111111111",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    terapeuta_email: "marcos.terapeuta@intea.com.br",
    sessao_id: "11111111-1111-4111-a111-111111111111",
    paciente_id: "p1111111-1111-4111-8111-111111111111",
    paciente_nome: "Lucas Gabriel Silva",
    jogo_nome: "Jornada Espacial TEA",
    origem: "dispositivo_jogo",
    acao: "dispositivo_pareado",
    descricao: "Tablet do paciente pareado com sucesso via session token efêmero.",
    ip: "192.168.1.189",
    user_agent: "InTEA-Game-Client/Android-13",
    detalhes_json: {
      session_token: "TEA-849",
      dispositivo_modelo: "Samsung Galaxy Tab S7 FE",
      bateria_inicial: 94,
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    created_at: "2026-10-21T17:48:00.000Z",
    entidade: "sessao",
    recurso_id: "11111111-1111-4111-a111-111111111111",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    terapeuta_email: "marcos.terapeuta@intea.com.br",
    sessao_id: "11111111-1111-4111-a111-111111111111",
    paciente_id: "p1111111-1111-4111-8111-111111111111",
    paciente_nome: "Lucas Gabriel Silva",
    jogo_nome: "Jornada Espacial TEA",
    origem: "terapeuta_web",
    acao: "sessao_criada",
    descricao: "Início de sessão terapêutica com injeção de parâmetros pré-sessão.",
    ip: "192.168.1.104",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) InTEA-Client/1.0",
    detalhes_json: {
      modo_sessao: "clinica",
      gatilhos_a_evitar: ["som_alto", "luz_piscante"],
      objetivo_clinico: "Manter foco de atenção sustentada por 15 min",
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    created_at: "2026-10-21T16:30:20.000Z",
    entidade: "paciente",
    recurso_id: "p2222222-2222-4222-8222-222222222222",
    terapeuta_id: "b2222222-2222-4222-8222-222222222222",
    terapeuta_nome: "Dra. Luma Terapeuta",
    terapeuta_email: "luma.terapeuta@intea.com.br",
    sessao_id: null,
    paciente_id: "p2222222-2222-4222-8222-222222222222",
    paciente_nome: "Beatriz Helena Costa",
    origem: "terapeuta_web",
    acao: "acesso_prontuario",
    descricao: "Consulta clínica ao prontuário integrado e histórico de telemetrias.",
    ip: "192.168.1.112",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) InTEA-Client/1.0",
    detalhes_json: {
      motivo_consulta: "Evolução clínica semanal e preparo de intervenção",
      secoes_visualizadas: ["anamnese", "evolucao_recente", "telemetria_historica"],
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    created_at: "2026-10-21T15:10:45.000Z",
    entidade: "anotacao",
    recurso_id: "p2222222-2222-4222-8222-222222222222",
    terapeuta_id: "b2222222-2222-4222-8222-222222222222",
    terapeuta_nome: "Dra. Luma Terapeuta",
    terapeuta_email: "luma.terapeuta@intea.com.br",
    sessao_id: null,
    paciente_id: "p2222222-2222-4222-8222-222222222222",
    paciente_nome: "Beatriz Helena Costa",
    origem: "terapeuta_web",
    acao: "anotacao_clinica_criada",
    descricao: "Inserção de nota evolutiva com categorização de comportamento sensorial.",
    ip: "192.168.1.112",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) InTEA-Client/1.0",
    detalhes_json: {
      categoria: "sensorial",
      visibilidade: "equipe_clinica",
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000007",
    created_at: "2026-10-21T14:22:18.000Z",
    entidade: "autenticacao",
    recurso_id: "11111111-1111-4111-a111-111111111111",
    terapeuta_id: "c3333333-3333-4333-8333-333333333333",
    terapeuta_nome: "Dr. João Externo",
    terapeuta_email: "joao.externo@outraclinica.com.br",
    sessao_id: "11111111-1111-4111-a111-111111111111",
    paciente_id: "p1111111-1111-4111-8111-111111111111",
    paciente_nome: "Lucas Gabriel Silva",
    origem: "api_rest",
    acao: "tentativa_acesso_negado",
    descricao: "Bloqueio preventivo de segurança: tentativa de acesso a prontuário de outra instituição clínica (403 Forbidden).",
    ip: "200.145.22.8",
    user_agent: "PostmanRuntime/7.32.3",
    detalhes_json: {
      regra_violada: "Isolamento Institucional de Clínica",
      status_http: 403,
      clinica_origem_terapeuta: "c9999999-9999-4999-8999-999999999999",
      clinica_paciente: "c1111111-1111-4111-8111-111111111111",
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000008",
    created_at: "2026-10-21T11:45:00.000Z",
    entidade: "exportacao",
    recurso_id: "11111111-1111-4111-a111-111111111111",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    terapeuta_email: "marcos.terapeuta@intea.com.br",
    sessao_id: "11111111-1111-4111-a111-111111111111",
    paciente_id: "p1111111-1111-4111-8111-111111111111",
    paciente_nome: "Lucas Gabriel Silva",
    origem: "terapeuta_web",
    acao: "exportacao_laudo",
    descricao: "Exportação em PDF/CSV do laudo estruturado e histórico de sessões para os responsáveis legais.",
    ip: "192.168.1.104",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) InTEA-Client/1.0",
    detalhes_json: {
      formato: "PDF",
      modulo: "Exportação de Laudos",
      destino: "compartilhamento_familiar",
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000009",
    created_at: "2026-10-20T16:00:15.000Z",
    entidade: "vinculo",
    recurso_id: "p3333333-3333-4333-8333-333333333333",
    terapeuta_id: "b2222222-2222-4222-8222-222222222222",
    terapeuta_nome: "Dra. Luma Terapeuta",
    terapeuta_email: "luma.terapeuta@intea.com.br",
    sessao_id: null,
    paciente_id: "p3333333-3333-4333-8333-333333333333",
    paciente_nome: "Enzo Henrique Oliveira",
    origem: "sistema_admin",
    acao: "paciente_vinculado",
    descricao: "Vínculo institucional ativo estabelecido entre terapeuta e novo paciente na clínica.",
    ip: "192.168.1.112",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) InTEA-Client/1.0",
    detalhes_json: {
      clinica_id: "c1111111-1111-4111-8111-111111111111",
      terapeuta_responsavel: true,
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000010",
    created_at: "2026-10-20T09:12:00.000Z",
    entidade: "autenticacao",
    recurso_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e",
    terapeuta_nome: "Dr. Marcos Terapeuta",
    terapeuta_email: "marcos.terapeuta@intea.com.br",
    sessao_id: null,
    paciente_id: null,
    origem: "terapeuta_web",
    acao: "login_realizado",
    descricao: "Autenticação bem-sucedida via credenciais seguras e emissão de credencial clínica (JWT).",
    ip: "192.168.1.104",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) InTEA-Client/1.0",
    detalhes_json: {
      metodo: "jwt_bearer",
      clinica_nome: "Clínica Escola UFPI",
    },
  },
];

export const auditoriaAdminService = {
  /**
   * Lists unified audit trail events with support for search, filters, and pagination.
   */
  listar: async (filtros?: FiltrosAuditoriaDTO): Promise<RespostaPaginadaAuditoria> => {
    return await withFallback(
      async () => {
        const params: Record<string, string> = {};
        if (filtros?.busca) params.busca = filtros.busca;
        if (filtros?.entidade && filtros.entidade !== "todas") {
          params.entidade = filtros.entidade;
        }
        if (filtros?.terapeutaId && filtros.terapeutaId !== "todos") {
          params.terapeutaId = filtros.terapeutaId;
        }
        if (filtros?.pacienteId) params.pacienteId = filtros.pacienteId;
        if (filtros?.clinicaId) params.clinicaId = filtros.clinicaId;
        if (filtros?.tipoAcao && filtros.tipoAcao !== "todas") {
          params.tipoAcao = filtros.tipoAcao;
        }
        if (filtros?.origem && filtros.origem !== "todas") {
          params.origem = filtros.origem;
        }
        if (filtros?.dataInicio) params.dataInicio = filtros.dataInicio;
        if (filtros?.dataFim) params.dataFim = filtros.dataFim;
        if (filtros?.page) params.page = String(filtros.page);
        if (filtros?.limit) params.limit = String(filtros.limit);

        const resposta = await http.get<
          | {
              data:
                | {
                    auditoria?: Array<Partial<EventoAuditoria> & Record<string, unknown>>;
                    registros?: Array<Partial<EventoAuditoria> & Record<string, unknown>>;
                    meta?: { page: number; limit: number; total: number; totalPages: number };
                  }
                | Array<Partial<EventoAuditoria> & Record<string, unknown>>;
              total?: number;
              meta?: { page: number; limit: number; total: number; totalPages: number };
            }
          | RespostaPaginadaAuditoria
        >("/admin/auditoria", { params });

        let eventosRaw: Array<Partial<EventoAuditoria> & Record<string, unknown>> = [];
        let total = 0;
        let meta = {
          page: Number(filtros?.page || 1),
          limit: Number(filtros?.limit || 10),
          totalPages: 1,
          total: 0,
        };

        if (resposta && typeof resposta === "object") {
          if ("data" in resposta && resposta.data) {
            const d = resposta.data as Record<string, unknown>;
            if (Array.isArray(d.auditoria)) {
              eventosRaw = d.auditoria as Array<Partial<EventoAuditoria> & Record<string, unknown>>;
            } else if (Array.isArray(d.registros)) {
              eventosRaw = d.registros as Array<Partial<EventoAuditoria> & Record<string, unknown>>;
            } else if (Array.isArray(resposta.data)) {
              eventosRaw = resposta.data as Array<Partial<EventoAuditoria> & Record<string, unknown>>;
            }

            if (d.meta && typeof d.meta === "object") {
              const m = d.meta as Record<string, number>;
              meta = {
                page: m.page || meta.page,
                limit: m.limit || meta.limit,
                total: m.total ?? eventosRaw.length,
                totalPages:
                  m.totalPages || Math.ceil((m.total ?? eventosRaw.length) / meta.limit) || 1,
              };
              total = meta.total;
            } else if ("meta" in resposta && resposta.meta) {
              meta = resposta.meta as typeof meta;
              total = meta.total;
            } else {
              total =
                "total" in resposta && typeof resposta.total === "number"
                  ? resposta.total
                  : eventosRaw.length;
              meta.total = total;
              meta.totalPages = Math.ceil(total / meta.limit) || 1;
            }
          } else if (Array.isArray(resposta)) {
            eventosRaw = resposta as Array<Partial<EventoAuditoria> & Record<string, unknown>>;
            total = eventosRaw.length;
            meta.total = total;
          }
        }

        return {
          data: eventosRaw.map(normalizarEventoAuditoria),
          total,
          meta,
        };
      },
      () => {
        let filtrados = [...MOCK_EVENTOS_AUDITORIA];

        if (filtros?.busca) {
          const termo = filtros.busca.toLowerCase().trim();
          filtrados = filtrados.filter((ev) => {
            return (
              ev.terapeuta_nome?.toLowerCase().includes(termo) ||
              ev.terapeuta_email?.toLowerCase().includes(termo) ||
              ev.paciente_nome?.toLowerCase().includes(termo) ||
              ev.entidade?.toLowerCase().includes(termo) ||
              ev.acao.toLowerCase().includes(termo) ||
              ev.descricao?.toLowerCase().includes(termo) ||
              ev.ip?.toLowerCase().includes(termo) ||
              ev.sessao_id?.toLowerCase().includes(termo) ||
              ev.terapeuta_id?.toLowerCase().includes(termo) ||
              ev.paciente_id?.toLowerCase().includes(termo)
            );
          });
        }

        if (filtros?.entidade && filtros.entidade !== "todas") {
          filtrados = filtrados.filter((ev) => ev.entidade === filtros.entidade);
        }

        if (filtros?.terapeutaId && filtros.terapeutaId !== "todos") {
          filtrados = filtrados.filter(
            (ev) =>
              ev.terapeuta_id === filtros.terapeutaId ||
              ev.terapeuta_nome === filtros.terapeutaId
          );
        }

        if (filtros?.pacienteId) {
          filtrados = filtrados.filter((ev) => ev.paciente_id === filtros.pacienteId);
        }

        if (filtros?.tipoAcao && filtros.tipoAcao !== "todas") {
          filtrados = filtrados.filter((ev) => ev.acao === filtros.tipoAcao);
        }

        if (filtros?.dataInicio) {
          filtrados = filtrados.filter((ev) => {
            const dataEvento = ev.created_at.split("T")[0];
            return dataEvento >= (filtros.dataInicio as string);
          });
        }

        if (filtros?.dataFim) {
          filtrados = filtrados.filter((ev) => {
            const dataEvento = ev.created_at.split("T")[0];
            return dataEvento <= (filtros.dataFim as string);
          });
        }

        if (filtros?.origem && filtros.origem !== "todas") {
          filtrados = filtrados.filter((ev) => ev.origem === filtros.origem);
        }

        const page = filtros?.page || 1;
        const limit = filtros?.limit || 10;
        const total = filtrados.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const start = (page - 1) * limit;
        const paginados = filtrados.slice(start, start + limit);

        return {
          data: paginados,
          total,
          meta: {
            page,
            limit,
            totalPages,
            total,
          },
        };
      }
    );
  },

  /**
   * Retrieves aggregated compliance statistics for the audit dashboard header.
   */
  buscarEstatisticas: async (): Promise<EstatisticasAuditoria> => {
    return await withFallback(
      async () => {
        const resposta = await http.get<{
          data?: { estatisticas?: EstatisticasAuditoria } | EstatisticasAuditoria;
          estatisticas?: EstatisticasAuditoria;
        } | EstatisticasAuditoria>("/admin/auditoria/estatisticas");

        if (resposta && typeof resposta === "object") {
          if ("data" in resposta && resposta.data) {
            const d = resposta.data as Record<string, unknown>;
            if ("estatisticas" in d && d.estatisticas) {
              return d.estatisticas as EstatisticasAuditoria;
            }
            if ("totalEventos" in d) {
              return d as unknown as EstatisticasAuditoria;
            }
          }
          if ("estatisticas" in resposta && resposta.estatisticas) {
            return resposta.estatisticas;
          }
          if ("totalEventos" in resposta) {
            return resposta as EstatisticasAuditoria;
          }
        }

        return {
          totalEventos: 0,
          acessosProntuario: 0,
          sessoesEIntervencoes: 0,
          alertasSeguranca: 0,
        };
      },
      () => {
        const totalEventos = MOCK_EVENTOS_AUDITORIA.length;
        const acessosProntuario = MOCK_EVENTOS_AUDITORIA.filter(
          (e) => e.acao === "acesso_prontuario"
        ).length;
        const sessoesEIntervencoes = MOCK_EVENTOS_AUDITORIA.filter((e) =>
          ["sessao_criada", "sessao_finalizada", "intervencao_dda"].includes(
            e.acao
          )
        ).length;
        const alertasSeguranca = MOCK_EVENTOS_AUDITORIA.filter(
          (e) => e.acao === "tentativa_acesso_negado"
        ).length;

        return {
          totalEventos,
          acessosProntuario,
          sessoesEIntervencoes,
          alertasSeguranca,
        };
      }
    );
  },

  /**
   * Exports audit log events into a structured CSV file aligned 1:1 with JSON fields.
   */
  exportarCSV: (eventos: EventoAuditoria[], nomeArquivo?: string): void => {
    const cabecalhos = [
      "ID do Evento",
      "Data e Hora (UTC)",
      "Entidade",
      "Acao",
      "Origem",
      "ID Terapeuta",
      "Terapeuta Responsavel",
      "E-mail Terapeuta",
      "ID Paciente",
      "Paciente",
      "ID da Sessao",
      "ID do Recurso",
      "Endereco IP",
      "Descricao",
      "Detalhes Contextuais",
    ];

    const escapeCSV = (valor: unknown): string => {
      if (valor === null || valor === undefined) return '""';
      const texto = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const normalizados = eventos.map((ev) =>
      normalizarEventoAuditoria(ev as EventoAuditoria & Record<string, unknown>)
    );

    const linhas = normalizados.map((ev) =>
      [
        escapeCSV(ev.id),
        escapeCSV(ev.created_at),
        escapeCSV(ev.entidade || "sistema"),
        escapeCSV(ev.acao),
        escapeCSV(ev.origem),
        escapeCSV(ev.terapeuta_id || "N/A"),
        escapeCSV(ev.terapeuta_nome || "Sistema Automatizado"),
        escapeCSV(ev.terapeuta_email || "N/A"),
        escapeCSV(ev.paciente_id || "N/A"),
        escapeCSV(ev.paciente_nome || "Sem paciente"),
        escapeCSV(ev.sessao_id || "N/A"),
        escapeCSV(ev.recurso_id || "N/A"),
        escapeCSV(ev.ip || "Não registrado"),
        escapeCSV(ev.descricao || ""),
        escapeCSV(ev.detalhes_json),
      ].join(",")
    );

    const conteudoCSV = "\uFEFF" + [cabecalhos.join(","), ...linhas].join("\n");
    const blob = new Blob([conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dataHoje = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      nomeArquivo || `relatorio_auditoria_intea_${dataHoje}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Exports audit log events into a normalized JSON file aligned 1:1 with CSV fields.
   */
  exportarJSON: (eventos: EventoAuditoria[], nomeArquivo?: string): void => {
    const payloadAlinhado = eventos.map((raw) => {
      const ev = normalizarEventoAuditoria(raw as EventoAuditoria & Record<string, unknown>);
      return {
        id: ev.id,
        created_at: ev.created_at,
        entidade: ev.entidade || "sistema",
        acao: ev.acao,
        origem: ev.origem,
        terapeuta_id: ev.terapeuta_id || null,
        terapeuta_nome: ev.terapeuta_nome || "Sistema Automatizado",
        terapeuta_email: ev.terapeuta_email || null,
        paciente_id: ev.paciente_id || null,
        paciente_nome: ev.paciente_nome || null,
        sessao_id: ev.sessao_id || null,
        clinica_id: ev.clinica_id || null,
        clinica_nome: ev.clinica_nome || null,
        recurso_id: ev.recurso_id || null,
        ip: ev.ip || "Não registrado",
        user_agent: ev.user_agent || null,
        descricao: ev.descricao || null,
        detalhes_json: ev.detalhes_json,
      };
    });

    const jsonFormatado = JSON.stringify(payloadAlinhado, null, 2);
    const blob = new Blob([jsonFormatado], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dataHoje = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      nomeArquivo || `relatorio_auditoria_intea_${dataHoje}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
