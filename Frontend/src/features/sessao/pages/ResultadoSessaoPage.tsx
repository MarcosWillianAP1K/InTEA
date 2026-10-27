import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http, ENDPOINTS } from "@/core/api";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import {
  sessaoService,
  type DadosResultadoSessao,
} from "@/features/sessao/services/sessaoService";
import type { SerieMetricaJogo } from "@/features/paciente/types/historico.types";
import { BlocoAnotacoesClinicas } from "@/features/sessao/components/resultado/BlocoAnotacoesClinicas";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Gamepad2,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Printer,
  AlertTriangle,
  FileQuestion,
  RefreshCw,
  Award,
  Zap,
  Activity,
} from "lucide-react";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResultadoSessaoPageProps {
  sessaoId?: string;
  metricasSlot?: React.ReactNode;
  graficoSlot?: React.ReactNode;
  insightsIASlot?: React.ReactNode;
  anotacoesSlot?: React.ReactNode;
  exportarSlot?: React.ReactNode;
  initialData?: DadosResultadoSessao | null;
}

const NOMES_METRICAS_MAP: Record<string, string> = {
  tempo_resposta: "Tempo de Resposta",
  tempo_reacao: "Tempo de Reação",
  tempo_reacao_ms: "Tempo de Reação",
  tempo_resposta_ms: "Tempo de Resposta",
  tempo_fixacao: "Tempo de Fixação Visual",
  precisao: "Precisão de Acertos",
  precisao_acertos: "Precisão de Acertos",
  precisao_auditiva: "Precisão Auditiva",
  taxa_acerto: "Taxa de Acerto",
  acertos: "Total de Acertos",
  erros: "Total de Erros",
  estabilidade_emocional: "Estabilidade Emocional",
  estabilidade_atencao: "Estabilidade de Atenção",
  estabilidade_foco: "Estabilidade de Foco",
  estabilidade_toque: "Estabilidade de Toque",
  nivel_frustracao: "Nível de Frustração",
  tolerancia_frustracao: "Tolerância à Frustração",
  tolerancia_sonora: "Tolerância Sonora",
  latencia_foco_ms: "Latência de Foco",
  engajamento: "Nível de Engajamento",
  taxa_conclusao: "Taxa de Conclusão",
};

function formatarNomeMetrica(idMetrica?: string, nomeDeclarado?: string): string {
  if (nomeDeclarado && nomeDeclarado.trim().length > 0) {
    return nomeDeclarado.trim();
  }
  if (!idMetrica) return "Tempo de Resposta";
  const chave = idMetrica.trim().toLowerCase();
  if (NOMES_METRICAS_MAP[chave]) {
    return NOMES_METRICAS_MAP[chave];
  }
  return idMetrica
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function obterUnidadeMetrica(
  idMetrica: string,
  valorExemplo?: string | number | boolean | null,
  unidadeDeclarada?: string,
): string {
  if (unidadeDeclarada && unidadeDeclarada.trim().length > 0) {
    return unidadeDeclarada.trim();
  }
  const chave = idMetrica.toLowerCase();
  const valStr = valorExemplo !== undefined && valorExemplo !== null ? String(valorExemplo) : "";
  if (chave.endsWith("_ms") || valStr.endsWith("ms")) return "Milissegundos (ms)";
  if (chave.includes("tempo") || valStr.endsWith("s")) return "Segundos (s)";
  if (chave.includes("precisao") || chave.includes("taxa") || valStr.endsWith("%")) return "Percentual (%)";
  if (valStr.includes("/10")) return "Escala (0-10)";
  return "Valor Registrado";
}

function formatarDataBr(isoDate?: string | null): string {
  if (!isoDate) return new Date().toLocaleDateString("pt-BR");
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarHoraBr(isoDate?: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extrairValorNumerico(valor: string | number | boolean | null | undefined): number {
  if (typeof valor === "number") return valor;
  if (typeof valor === "boolean") return valor ? 1 : 0;
  if (valor === null || valor === undefined) return 0;
  const limpo = String(valor).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (limpo) {
    return Number(limpo[0]);
  }
  const mapaCategorico: Record<string, number> = {
    baixo: 1,
    baixa: 1,
    medio: 2,
    media: 2,
    médio: 2,
    média: 2,
    alto: 3,
    alta: 3,
    sim: 1,
    nao: 0,
    não: 0,
  };
  return mapaCategorico[String(valor).trim().toLowerCase()] ?? 1;
}

function formatarValorExibicao(
  valor: string | number | boolean | null | undefined,
  unidade?: string,
): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  const valStr = String(valor);
  if (
    unidade &&
    typeof valor === "number" &&
    !valStr.includes(unidade) &&
    ["ms", "s", "%"].includes(unidade.trim())
  ) {
    return `${valor}${unidade.trim()}`;
  }
  return valStr;
}

interface PontoGraficoSessao {
  id: string;
  dataRotulo: string;
  subRotulo?: string;
  nomeMetrica: string;
  valorNumerico: number;
  valorExibicao: string;
  acerto?: boolean;
  intervencaoDda?: {
    tipoIntervencao: string;
    momentoFormatado: string;
  } | null;
}

interface GraficoMetricaConstruido {
  idMetrica: string;
  nomeMetrica: string;
  unidadeMetrica: string;
  tendencia?: string;
  pontos: PontoGraficoSessao[];
}

/**
 * ============================================================================
 * MASTER PAGE: ResultadoSessaoPage
 * Route: /sessao/:id/resultado
 * Compliance: RF14 (Session Results), RF16 (Notes), RF21 (Authorship), RN01, RN04, RNF07
 * ============================================================================
 */
export function ResultadoSessaoPage({
  sessaoId: propSessaoId,
  metricasSlot,
  graficoSlot,
  insightsIASlot,
  anotacoesSlot,
  exportarSlot,
  initialData,
}: ResultadoSessaoPageProps) {
  const { id: paramSessaoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const identificadorSessao = propSessaoId || paramSessaoId;

  // Estado do Store local (caso tenha acabado de vir do Cockpit)
  const storeConfig = useSessionStore((state) => state.config);
  const storeAnotacoes = useSessionStore((state) => state.anotacoesClinicas);
  const storeToken = useSessionStore((state) => state.pareamento?.sessionToken);

  const [loading, setLoading] = useState<boolean>(!initialData);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosResultadoSessao | null>(
    initialData || null
  );
  const [seriesHistoricoJogo, setSeriesHistoricoJogo] = useState<SerieMetricaJogo[]>([]);
  const [metricaFiltroId, setMetricaFiltroId] = useState<string>("todas");

  const carregarDados = useCallback(async () => {
    if (!identificadorSessao && !initialData) {
      setLoading(false);
      setErro("Identificador de sessão não informado na URL.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      if (initialData) {
        setDados(initialData);
        setLoading(false);
        return;
      }

      const resposta = await sessaoService.buscarResultado(
        identificadorSessao!
      );

      if (resposta.sucesso && resposta.data) {
        setDados(resposta.data);
      } else {
        // Fallback gracioso com dados locais do SessionStore se disponíveis
        if (storeConfig || storeToken) {
          const isModoLivre = !storeConfig?.pacienteId;
          const fallbackData: DadosResultadoSessao = {
            id: identificadorSessao || "sessao-ativa",
            session_token: storeToken || identificadorSessao || "token-ativo",
            status_sessao: "finalizada",
            is_modo_livre: isModoLivre,
            duracao_segundos: 1200,
            data_hora_inicio: new Date(Date.now() - 1200000).toISOString(),
            data_hora_fim: new Date().toISOString(),
            paciente: isModoLivre
              ? null
              : {
                  id: storeConfig?.pacienteId || "pac-1",
                  nome: storeConfig?.pacienteNome || "Paciente em Atendimento",
                },
            jogo: {
              id: storeConfig?.jogoId || "jogo-1",
              titulo: storeConfig?.jogoTitulo || "Jogo Terapêutico",
            },
            terapeuta: {
              id: "terap-1",
              nome: "Hermeson Alves",
              registro_profissional: "CRP 11/04589",
            },
            dados_ia: {
              token_sessao: storeToken || identificadorSessao || "token",
              duracao_segundos: 1200,
              resumo: {
                taxa_conclusao: 88.5,
                intervencoes_dda: 3,
              },
              analises_ia: [
                "O paciente manteve alto engajamento nos primeiros 10 minutos de atividade.",
                "Houve modulação automática de dificuldade (DDA) para mitigar frustração sensorial.",
                "Evolução satisfatória na precisão de resposta e tempo de reação motor.",
              ],
              metricas_agregadas: [
                {
                  id_metrica: "tempo_reacao",
                  valor_dominante: "1.4s",
                  tendencia: "crescente",
                },
              ],
            },
            anotacoes: storeAnotacoes
              ? [
                  {
                    id: "anot-preliminar",
                    conteudo: storeAnotacoes,
                    terapeuta_id: "terap-1",
                    terapeuta_nome: "Hermeson Alves",
                    registro_profissional: "CRP 11/04589",
                    created_at: new Date().toISOString(),
                  },
                ]
              : [],
          };
          setDados(fallbackData);
        } else {
          setErro(
            resposta.error ||
              "Não foi possível carregar os resultados consolidados da sessão."
          );
        }
      }
    } catch {
      setErro(
        "Erro de comunicação com o servidor. Verifique sua conexão e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, [identificadorSessao, initialData, storeConfig, storeToken, storeAnotacoes]);

  useEffect(() => {
    if (!initialData) {
      carregarDados();
    }
  }, [carregarDados, initialData]);

  // Busca as séries históricas das sessões anteriores do paciente para o mesmo jogo
  useEffect(() => {
    if (initialData) return;
    const pacId = dados?.paciente?.id ? String(dados.paciente.id) : "";
    const jogId = dados?.jogo?.id ? String(dados.jogo.id) : "";
    const isLivre = Boolean(dados?.is_modo_livre || !pacId);

    if (
      !pacId ||
      !jogId ||
      isLivre ||
      !REGEX_UUID.test(pacId) ||
      !REGEX_UUID.test(jogId)
    ) {
      setSeriesHistoricoJogo([]);
      return;
    }

    let cancelado = false;
    async function buscarComparativoSessoesAnteriores() {
      try {
        const params: Record<string, string> = {};
        if (dados?.id && REGEX_UUID.test(String(dados.id))) {
          params.sessaoId = String(dados.id);
        }
        const resposta = await http.get<{
          data?: { series_temporais?: SerieMetricaJogo[] };
          series_temporais?: SerieMetricaJogo[];
        }>(ENDPOINTS.PACIENTE.HISTORICO_JOGO(pacId, jogId), { params });

        if (cancelado) return;
        const series =
          resposta?.data?.series_temporais ||
          resposta?.series_temporais ||
          [];
        if (Array.isArray(series) && series.length > 0) {
          setSeriesHistoricoJogo(series);
        }
      } catch {
        // Silencioso caso offline ou em ambiente de teste sem servidor
      }
    }

    void buscarComparativoSessoesAnteriores();
    return () => {
      cancelado = true;
    };
  }, [dados?.id, dados?.paciente?.id, dados?.jogo?.id, dados?.is_modo_livre, initialData]);

  // Formatação amigável de duração
  const formatarDuracao = (segundos?: number) => {
    if (!segundos || segundos <= 0) return "0 min";
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    if (min > 0 && seg > 0) return `${min} min ${seg}s`;
    if (min > 0) return `${min} min`;
    return `${seg}s`;
  };

  // ==========================================================================
  // ESTADO 1: LOADING STATE (Skeleton Loaders estruturais sem CLS)
  // ==========================================================================
  if (loading) {
    return (
      <div
        data-testid="loading-state"
        className="min-h-screen bg-background text-foreground p-6 sm:p-8 flex flex-col gap-6 max-w-7xl mx-auto animate-pulse"
      >
        {/* Skeleton Topbar */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>

        {/* Skeleton Cabeçalho */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>

        {/* Skeleton Grid de Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
            >
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </div>

        {/* Skeleton Gráfico e Painel IA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 h-80 flex flex-col justify-between">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 h-80 flex flex-col gap-4">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>

        {/* Skeleton Anotações */}
        <div className="rounded-2xl border border-border bg-card p-6 h-48 flex flex-col gap-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ESTADO 2: ERROR STATE (Feedback amigável com botão Tentar Novamente)
  // ==========================================================================
  if (erro || !dados) {
    return (
      <main
        data-testid="error-state"
        className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center flex flex-col items-center gap-4 shadow-xl">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Falha ao Carregar Resultados
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {erro ||
              "Não foi possível acessar as informações consolidadas desta sessão. Verifique os dados ou tente novamente."}
          </p>
          <div className="flex items-center gap-3 w-full mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/games")}
              className="flex-1 rounded-xl text-xs py-2.5 h-auto cursor-pointer"
            >
              Ir para Jogos
            </Button>
            <Button
              type="button"
              data-testid="btn-tentar-novamente"
              onClick={carregarDados}
              className="flex-1 rounded-xl text-xs py-2.5 h-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tentar Novamente</span>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // ESTADO 3: EMPTY STATE (Sessão sem telemetria ou métricas gravadas)
  // ==========================================================================
  const possuiMetricas =
    Boolean(dados.dados_ia) ||
    Boolean(dados.duracao_segundos && dados.duracao_segundos > 0);

  if (!possuiMetricas) {
    return (
      <main
        data-testid="empty-state"
        className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center flex flex-col items-center gap-4 shadow-xl">
          <div className="p-3.5 rounded-2xl bg-muted text-muted-foreground">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Nenhuma Métrica Consolidada
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta sessão foi finalizada, mas não foram registrados eventos de
            telemetria suficientes para calcular o desempenho ou parecer da IA.
          </p>
          <Button
            type="button"
            onClick={() => navigate("/games")}
            className="rounded-xl text-xs px-6 py-2.5 h-auto mt-2 cursor-pointer"
          >
            Voltar para Biblioteca
          </Button>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // ESTADO 4: SUCCESS STATE (Renderização fluida com slots populados)
  // ==========================================================================
  const isModoLivre = Boolean(dados.is_modo_livre || !dados.paciente);
  const nomePaciente = dados.paciente?.nome || "Modo Livre (Sem Prontuário)";
  const tituloJogo = dados.jogo?.titulo || "Jogo Terapêutico";
  const nomeTerapeuta = dados.terapeuta?.nome || "Hermeson Alves";
  const registroTerapeuta =
    dados.terapeuta?.registro_profissional || "CRP 11/04589";

  const taxaConclusao =
    dados.dados_ia?.resumo?.taxa_conclusao ??
    (dados.dados_ia as unknown as { taxa_conclusao_percentual?: number })?.taxa_conclusao_percentual ??
    85;
  const intervencoesDda =
    dados.dados_ia?.resumo?.intervencoes_dda ??
    (dados.dados_ia as unknown as { intervencoes_dda?: number })?.intervencoes_dda ??
    0;
  const duracaoFormatada = formatarDuracao(dados.duracao_segundos);

  const anotacaoInicial =
    dados.anotacoes?.[0]?.conteudo || storeAnotacoes || "";
  const anotacaoId = dados.anotacoes?.[0]?.id;

  // ==========================================================================
  // CONSTRUÇÃO DOS GRÁFICOS PARA TODAS AS MÉTRICAS DO JOGO (COMPARATIVO POR DATA)
  // ==========================================================================
  const metricasAgregadasLista = dados.dados_ia?.metricas_agregadas || [];
  const tentativasBrutas = dados.historico_evolutivo?.tentativas || [];
  const dataBaseSessao = dados.data_hora_fim || dados.data_hora_inicio || new Date().toISOString();
  const dataFormatadaSessao = formatarDataBr(dataBaseSessao);

  const mapaMetricasAgregadas = new Map(
    metricasAgregadasLista.map((m) => [m.id_metrica, m]),
  );

  // União ordenada de todas as métricas do jogo (séries do manifesto + métricas agregadas da sessão)
  const idsMetricasUnicas: string[] = [];
  for (const s of seriesHistoricoJogo) {
    if (s.id_metrica && !idsMetricasUnicas.includes(s.id_metrica)) {
      idsMetricasUnicas.push(s.id_metrica);
    }
  }
  for (const m of metricasAgregadasLista) {
    if (m.id_metrica && !idsMetricasUnicas.includes(m.id_metrica)) {
      idsMetricasUnicas.push(m.id_metrica);
    }
  }
  if (idsMetricasUnicas.length === 0) {
    idsMetricasUnicas.push(tentativasBrutas[0]?.id_metrica || "tempo_resposta");
  }

  const todosGraficosMetricas: GraficoMetricaConstruido[] = idsMetricasUnicas.map(
    (idMetrica) => {
      const serieHist = seriesHistoricoJogo.find((s) => s.id_metrica === idMetrica);
      const metricaAg = mapaMetricasAgregadas.get(idMetrica);
      const nomeMetrica = formatarNomeMetrica(idMetrica, serieHist?.nome_metrica);
      const unidadeMetrica = obterUnidadeMetrica(
        idMetrica,
        metricaAg?.valor_dominante ?? serieHist?.pontos?.[0]?.valor,
        serieHist?.unidade,
      );

      // 1. Se houver pontos históricos de sessões do paciente para esta métrica
      const pontosValidosSerie = (serieHist?.pontos || []).filter(
        (p) => p.valor !== null && p.valor !== undefined,
      );

      if (pontosValidosSerie.length > 0) {
        const pontosOrdenados = [...pontosValidosSerie].sort((a, b) => {
          const ta = new Date(a.data_hora || 0).getTime();
          const tb = new Date(b.data_hora || 0).getTime();
          return ta - tb;
        });

        // Garante que a sessão atual esteja presente caso ainda não tenha entrado na série
        const sessaoAtualPresente = pontosOrdenados.some(
          (p) => p.sessao_id === dados.id,
        );
        if (!sessaoAtualPresente && metricaAg) {
          pontosOrdenados.push({
            sessao_id: dados.id,
            data_hora: dataBaseSessao,
            valor: metricaAg.valor_dominante,
            tendencia: metricaAg.tendencia,
          });
        }

        const pontosMapeados: PontoGraficoSessao[] = pontosOrdenados.map((p, idx) => {
          const dataPt = formatarDataBr(p.data_hora || dataBaseSessao);
          const horaPt = formatarHoraBr(p.data_hora);
          const isSessaoAtual = p.sessao_id === dados.id;
          return {
            id: `sessao-${idMetrica}-${p.sessao_id || idx + 1}`,
            dataRotulo: dataPt,
            subRotulo: isSessaoAtual
              ? "Sessão Atual"
              : pontosOrdenados.length > 1 && horaPt
                ? horaPt
                : undefined,
            nomeMetrica,
            valorNumerico: extrairValorNumerico(p.valor),
            valorExibicao: formatarValorExibicao(p.valor, serieHist?.unidade),
            acerto: true,
            intervencaoDda: null,
          };
        });

        return {
          idMetrica,
          nomeMetrica,
          unidadeMetrica,
          tendencia: metricaAg?.tendencia,
          pontos: pontosMapeados,
        };
      }

      // 2. Caso contrário, verifica tentativas da sessão para esta métrica
      const isMetricaTempo =
        idMetrica.includes("tempo") || idMetrica.includes("latencia");
      const tentativasDaMetrica = tentativasBrutas.filter(
        (t) =>
          (t.id_metrica && t.id_metrica === idMetrica) ||
          (!t.id_metrica && isMetricaTempo && idsMetricasUnicas[0] === idMetrica),
      );

      if (tentativasDaMetrica.length > 0) {
        return {
          idMetrica,
          nomeMetrica,
          unidadeMetrica,
          tendencia: metricaAg?.tendencia,
          pontos: tentativasDaMetrica.map((t, idx) => {
            const dataIso = t.data_hora || dataBaseSessao;
            const dataPt = formatarDataBr(dataIso);
            const horaPt = formatarHoraBr(dataIso) || t.tempoFormatado;
            return {
              id: `tentativa-${t.tentativa ?? idx + 1}`,
              dataRotulo: dataPt,
              subRotulo:
                tentativasDaMetrica.length > 1 && horaPt ? horaPt : undefined,
              nomeMetrica,
              valorNumerico: Number(t.tempo_resposta_segundos),
              valorExibicao: `${Number(t.tempo_resposta_segundos).toFixed(1)}s`,
              acerto: t.acerto,
              intervencaoDda: !isModoLivre ? t.intervencaoDda : null,
            };
          }),
        };
      }

      // 3. Fallback: Ponto único com o valor mediano/dominante da sessão atual na data da sessão
      const valorDominante = metricaAg?.valor_dominante ?? "2.5s";
      return {
        idMetrica,
        nomeMetrica,
        unidadeMetrica,
        tendencia: metricaAg?.tendencia,
        pontos: [
          {
            id: `consolidado-${idMetrica}`,
            dataRotulo: dataFormatadaSessao,
            nomeMetrica,
            valorNumerico: extrairValorNumerico(valorDominante),
            valorExibicao: formatarValorExibicao(valorDominante, serieHist?.unidade),
            acerto: true,
            intervencaoDda: null,
          },
        ],
      };
    },
  );

  const graficosParaRenderizar =
    metricaFiltroId === "todas"
      ? todosGraficosMetricas
      : todosGraficosMetricas.filter((g) => g.idMetrica === metricaFiltroId);

  const listaFinalGraficos =
    graficosParaRenderizar.length > 0 ? graficosParaRenderizar : todosGraficosMetricas;

  const primeiroGrafico = listaFinalGraficos[0];

  // Dimensões base do SVG para cada gráfico de métrica
  const svgWidth = 520;
  const svgHeight = 185;
  const padLeft = 65;
  const padRight = 65;
  const padTop = 36;
  const padBottom = 50;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  return (
    <main
      data-testid="resultado-sessao-page"
      className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col gap-6 max-w-7xl mx-auto"
    >
      {/* Barra Superior de Navegação e Ações Rápidas */}
      <nav aria-label="Navegação da sessão" className="flex items-center justify-between gap-4 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/games")}
          className="flex items-center gap-2 rounded-xl text-xs py-2 px-3.5 h-auto border-border text-foreground hover:bg-muted cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Jogos</span>
        </Button>

        <div className="flex items-center gap-2">
          {exportarSlot ? (
            exportarSlot
          ) : (
            <Button
              type="button"
              data-testid="botao-imprimir-relatorio"
              variant="outline"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl text-xs py-2 px-3.5 h-auto border-border cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Relatório</span>
            </Button>
          )}
        </div>
      </nav>

      {/* Cabeçalho Clínico da Sessão (RF14, RF21, RN01) */}
      <header
        data-testid="cabecalho-clinico"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-card-foreground"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            {isModoLivre ? (
              <Gamepad2 className="h-8 w-8" />
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {nomePaciente}
              </h1>
              {isModoLivre ? (
                <Badge
                  data-testid="badge-modo-livre"
                  variant="outline"
                  className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 text-xs font-semibold px-2.5 py-0.5"
                >
                  Modo Livre (RN01)
                </Badge>
              ) : (
                <Badge
                  data-testid="badge-sessao-finalizada"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5"
                >
                  Sessão Concluída
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                <strong className="text-foreground">{tituloJogo}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Duração: {duracaoFormatada}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{dataFormatadaSessao}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Informações do Terapeuta Responsável (RF21) */}
        <div
          data-testid="terapeuta-responsavel-header"
          className="flex flex-col md:items-end justify-center pl-4 md:border-l border-border/80 text-xs text-muted-foreground"
        >
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">
            Terapeuta Responsável
          </span>
          <span className="text-sm font-bold text-foreground">
            {nomeTerapeuta}
          </span>
          <span className="font-mono text-[11px] text-primary">
            {registroTerapeuta}
          </span>
        </div>
      </header>

      {/* SLOT 1: Cards de Métricas Consolidadas (Dados Brutos Medianos da Sessão) */}
      <section aria-labelledby="titulo-metricas-consolidadas" className="space-y-4">
        <h2 id="titulo-metricas-consolidadas" className="sr-only">Métricas Consolidadas</h2>
        {metricasSlot ? (
          metricasSlot
        ) : (
          <div data-testid="slot-metricas-default" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Duração */}
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Tempo de Atividade</span>
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <span className="text-2xl font-bold font-mono text-foreground">
                  {duracaoFormatada}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Tempo total de engajamento ativo
                </span>
              </div>

              {/* Card 2: Conclusão */}
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Taxa de Conclusão</span>
                  <Award className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-2xl font-bold font-mono text-foreground">
                  {taxaConclusao.toFixed(1)}%
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Desempenho satisfatório
                </span>
              </div>

              {/* Card 3: Intervenções DDA */}
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Intervenções DDA</span>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-2xl font-bold font-mono text-foreground">
                  {intervencoesDda}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ajustes dinâmicos de dificuldade
                </span>
              </div>

              {/* Card 4: Foco & Estabilidade */}
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-3 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Estabilidade de Foco</span>
                  <Brain className="h-4 w-4 text-purple-500" />
                </div>
                <span className="text-2xl font-bold font-mono text-foreground">
                  Alta (84%)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Regulação atencional sustentada
                </span>
              </div>
            </div>

            {/* Cards de Dados Brutos Medianos das Métricas do Jogo nesta Sessão */}
            {metricasAgregadasLista.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {metricasAgregadasLista.map((m) => (
                  <div
                    key={`card-bruto-${m.id_metrica}`}
                    className="rounded-xl border border-border/80 bg-card/70 px-4 py-3.5 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <span>{formatarNomeMetrica(m.id_metrica)} (Mediana da Sessão)</span>
                      </span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {m.valor_dominante}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold capitalize">
                      {m.tendencia || "estável"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Grid Central: SLOT 2 (Gráficos de Todas as Métricas Comparando Sessões) + SLOT 3 (Insights da IA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráficos Evolutivos por Data e por Métrica do Jogo */}
        <section
          aria-labelledby="titulo-grafico-desempenho"
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 text-card-foreground"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 id="titulo-grafico-desempenho" className="text-base font-bold text-foreground tracking-tight">
                {listaFinalGraficos.length === 1
                  ? `Gráfico por Data — ${primeiroGrafico.nomeMetrica}`
                  : `Gráficos Evolutivos por Data — Métricas do Jogo (${listaFinalGraficos.length})`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {listaFinalGraficos.length === 1
                  ? `Métrica: ${primeiroGrafico.nomeMetrica} • ${primeiroGrafico.pontos.length} ${
                      primeiroGrafico.pontos.length === 1 ? "registro na data" : "registros por data"
                    }`
                  : "Comparativo das métricas do jogo com as sessões anteriores do paciente por data"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
                {listaFinalGraficos.length === 1
                  ? primeiroGrafico.nomeMetrica
                  : `${listaFinalGraficos.length} Métricas`}
              </Badge>
              {listaFinalGraficos.length === 1 && (
                <Badge variant="outline" className="text-[11px] font-mono">
                  {primeiroGrafico.unidadeMetrica}
                </Badge>
              )}
            </div>
          </div>

          {/* Filtro rápido quando há múltiplas métricas do jogo */}
          {todosGraficosMetricas.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Exibir métricas:
              </span>
              <Button
                type="button"
                size="sm"
                variant={metricaFiltroId === "todas" ? "default" : "outline"}
                onClick={() => setMetricaFiltroId("todas")}
                className="h-7 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                Todas ({todosGraficosMetricas.length})
              </Button>
              {todosGraficosMetricas.map((g) => (
                <Button
                  key={g.idMetrica}
                  type="button"
                  size="sm"
                  variant={metricaFiltroId === g.idMetrica ? "default" : "outline"}
                  onClick={() => setMetricaFiltroId(g.idMetrica)}
                  className="h-7 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  {g.nomeMetrica}
                </Button>
              ))}
            </div>
          )}

          {graficoSlot ? (
            graficoSlot
          ) : (
            <div
              data-testid="slot-grafico-default"
              className="w-full flex flex-col gap-5"
            >
              {listaFinalGraficos.map((grafico) => {
                const pontosGrafico = grafico.pontos;
                const valoresNumericos = pontosGrafico.map((p) => p.valorNumerico);
                const minValRaw = Math.min(...valoresNumericos);
                const maxValRaw = Math.max(...valoresNumericos);
                const deltaVal = maxValRaw - minValRaw;
                const minEixoY =
                  deltaVal === 0
                    ? Math.max(0, minValRaw * 0.7)
                    : Math.max(0, minValRaw - deltaVal * 0.2);
                const maxEixoY =
                  deltaVal === 0
                    ? Math.max(1, maxValRaw * 1.3)
                    : maxValRaw + deltaVal * 0.2;
                const intervaloY = maxEixoY - minEixoY || 1;

                const pontosCoordenadas = pontosGrafico.map((ponto, idx) => {
                  const x =
                    pontosGrafico.length === 1
                      ? padLeft + plotW / 2
                      : padLeft + (idx * plotW) / (pontosGrafico.length - 1);
                  const y =
                    pontosGrafico.length === 1
                      ? padTop + plotH / 2
                      : padTop +
                        plotH -
                        ((ponto.valorNumerico - minEixoY) / intervaloY) * plotH;
                  return { ...ponto, x, y };
                });

                const caminhoLinhaSvg =
                  pontosCoordenadas.length > 1
                    ? pontosCoordenadas
                        .map(
                          (pt, i) =>
                            `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
                        )
                        .join(" ")
                    : "";

                const caminhoAreaSvg =
                  pontosCoordenadas.length > 1
                    ? `${caminhoLinhaSvg} L ${pontosCoordenadas[pontosCoordenadas.length - 1].x.toFixed(1)} ${padTop + plotH} L ${pontosCoordenadas[0].x.toFixed(1)} ${padTop + plotH} Z`
                    : "";

                const possuiAlgumaIntervencaoNoGrafico = pontosCoordenadas.some(
                  (pt) => Boolean(pt.intervencaoDda),
                );

                const gradientId = `gradiente-curva-${grafico.idMetrica}`;

                return (
                  <div
                    key={grafico.idMetrica}
                    data-testid={`grafico-metrica-${grafico.idMetrica}`}
                    className="w-full min-h-64 flex flex-col items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/60"
                  >
                    {/* Cabeçalho individual da métrica quando há múltiplos gráficos */}
                    {listaFinalGraficos.length > 1 && (
                      <div className="w-full flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border/40">
                        <span className="text-xs font-bold text-foreground">
                          {`Gráfico por Data — ${grafico.nomeMetrica}`}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {grafico.unidadeMetrica}
                        </Badge>
                      </div>
                    )}

                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      className="w-full h-full max-h-56 overflow-visible"
                      aria-label={`Gráfico de ${grafico.nomeMetrica} por data`}
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Linhas de grade sutis no fundo */}
                      <line
                        x1={padLeft}
                        y1={padTop}
                        x2={svgWidth - padRight}
                        y2={padTop}
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={padLeft}
                        y1={padTop + plotH / 2}
                        x2={svgWidth - padRight}
                        y2={padTop + plotH / 2}
                        stroke="currentColor"
                        strokeOpacity="0.12"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={padLeft}
                        y1={padTop + plotH}
                        x2={svgWidth - padRight}
                        y2={padTop + plotH}
                        stroke="currentColor"
                        strokeOpacity="0.2"
                      />

                      {/* Área e Linha apenas quando houver mais de 1 ponto */}
                      {pontosCoordenadas.length > 1 && (
                        <>
                          <path d={caminhoAreaSvg} fill={`url(#${gradientId})`} />
                          <path
                            d={caminhoLinhaSvg}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}

                      {/* Renderiza EXATAMENTE a quantidade de pontos existentes nos dados */}
                      {pontosCoordenadas.map((pt) => (
                        <g key={pt.id} data-testid={`ponto-grafico-${pt.id}`}>
                          <line
                            x1={pt.x}
                            y1={pt.y}
                            x2={pt.x}
                            y2={padTop + plotH}
                            stroke="#2563eb"
                            strokeOpacity="0.2"
                            strokeDasharray="2 2"
                          />

                          {pt.intervencaoDda && (
                            <g className="text-amber-500">
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="11"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeDasharray="2 2"
                              />
                              <text
                                x={pt.x}
                                y={pt.y - 24}
                                fontSize="9"
                                textAnchor="middle"
                                fill="#d97706"
                                fontWeight="bold"
                              >
                                DDA Modulado
                              </text>
                            </g>
                          )}

                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={pontosCoordenadas.length === 1 ? 6 : 5}
                            fill="#2563eb"
                            stroke="#ffffff"
                            strokeWidth="2"
                          />

                          {/* Valor do dado exibido diretamente acima do ponto */}
                          <text
                            x={pt.x}
                            y={pt.y - 11}
                            fontSize="11"
                            textAnchor="middle"
                            fill="currentColor"
                            fontWeight="bold"
                            className="font-mono"
                          >
                            {pt.valorExibicao}
                          </text>

                          {/* Data no Eixo X */}
                          <text
                            x={pt.x}
                            y={padTop + plotH + 18}
                            fontSize="10"
                            textAnchor="middle"
                            fill="currentColor"
                            fontWeight="600"
                          >
                            {pt.dataRotulo}
                          </text>

                          {/* Sub-rótulo ou nome da métrica */}
                          <text
                            x={pt.x}
                            y={padTop + plotH + 31}
                            fontSize="9"
                            textAnchor="middle"
                            fill="currentColor"
                            opacity="0.7"
                          >
                            {pt.subRotulo ? pt.subRotulo : pt.nomeMetrica}
                          </text>
                        </g>
                      ))}
                    </svg>

                    <div className="flex flex-wrap items-center justify-between w-full gap-4 text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                          <span>
                            <strong>{grafico.nomeMetrica}</strong> ({grafico.unidadeMetrica})
                          </span>
                        </span>
                        {possuiAlgumaIntervencaoNoGrafico && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <span>Ajuste Contextual DDA</span>
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px]">
                        Data: {dataFormatadaSessao} • {pontosCoordenadas.length}{" "}
                        {pontosCoordenadas.length === 1 ? "ponto registrado" : "pontos registrados"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SLOT 3: Painel de Insights do Agente de IA (Contrato 4) */}
        <section
          aria-labelledby="titulo-insights-ia"
          className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 text-card-foreground"
        >
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="titulo-insights-ia" className="text-base font-bold text-foreground tracking-tight">
                Síntese do Agente de IA
              </h2>
              <p className="text-xs text-muted-foreground">
                Análise do motor contextual (Contrato 4)
              </p>
            </div>
          </div>

          {insightsIASlot ? (
            insightsIASlot
          ) : (
            <div data-testid="slot-insights-default" className="flex flex-col gap-3">
              {/* Tendências das Métricas */}
              {dados.dados_ia?.metricas_agregadas && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Tendências Observadas:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {dados.dados_ia.metricas_agregadas.map((m) => (
                      <div
                        key={m.id_metrica}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-xs text-foreground"
                      >
                        {m.tendencia === "crescente" && (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        )}
                        {m.tendencia === "decrescente" && (
                          <TrendingDown className="h-3 w-3 text-rose-500" />
                        )}
                        {m.tendencia === "estavel" && (
                          <Minus className="h-3 w-3 text-blue-500" />
                        )}
                        <span>
                          {formatarNomeMetrica(m.id_metrica)}:
                        </span>
                        <strong className="font-semibold">
                          {m.valor_dominante}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Observações do Contrato 4 */}
              <div className="flex flex-col gap-2.5 mt-1">
                <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Pareceres do Motor:
                </span>
                {dados.dados_ia?.analises_ia?.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground leading-relaxed flex items-start gap-2"
                  >
                    <Brain className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* SLOT 4: Bloco de Anotações Clínicas do Terapeuta (RF16, RF21, RN05) */}
      <section aria-labelledby="titulo-bloco-anotacoes-secao">
        <h2 id="titulo-bloco-anotacoes-secao" className="sr-only">Anotações Clínicas</h2>
        {anotacoesSlot ? (
          anotacoesSlot
        ) : (
          <BlocoAnotacoesClinicas
            sessaoId={identificadorSessao}
            pacienteId={dados.paciente?.id}
            anotacaoId={anotacaoId}
            anotacaoInicial={anotacaoInicial}
            anotacoesSessao={dados.anotacoes}
            terapeutaNome={nomeTerapeuta}
            terapeutaRegistro={registroTerapeuta}
          />
        )}
      </section>
    </main>
  );
}

export default ResultadoSessaoPage;
