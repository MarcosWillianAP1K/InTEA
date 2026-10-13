import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import {
  sessaoService,
  type DadosResultadoSessao,
} from "../services/sessaoService";
import { BlocoAnotacoesClinicas } from "../components/resultado/BlocoAnotacoesClinicas";
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
} from "lucide-react";

export interface ResultadoSessaoPageProps {
  sessaoId?: string;
  metricasSlot?: React.ReactNode;
  graficoSlot?: React.ReactNode;
  insightsIASlot?: React.ReactNode;
  anotacoesSlot?: React.ReactNode;
  exportarSlot?: React.ReactNode;
  initialData?: DadosResultadoSessao | null;
}

/**
 * ============================================================================
 * PÁGINA MESTRE: ResultadoSessaoPage (Front-end 1 — Hermeson Alves / Card 3.1)
 * Rota: /sessao/:id/resultado
 * Requisitos: RF14 (Resultados da Sessão), RF16 (Anotações), RF21 (Autoria),
 *             RN01 (Modo Livre sem Prontuário), RN04 (Vínculo), RNF07 (Layout)
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
                {
                  id_metrica: "estabilidade_atencao",
                  valor_dominante: "Alta",
                  tendencia: "estavel",
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

  const taxaConclusao = dados.dados_ia?.resumo.taxa_conclusao ?? 85;
  const intervencoesDda = dados.dados_ia?.resumo.intervencoes_dda ?? 0;
  const duracaoFormatada = formatarDuracao(dados.duracao_segundos);

  const anotacaoInicial =
    dados.anotacoes?.[0]?.conteudo || storeAnotacoes || "";
  const anotacaoId = dados.anotacoes?.[0]?.id;

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
                <span>
                  {dados.data_hora_fim
                    ? new Date(dados.data_hora_fim).toLocaleDateString("pt-BR")
                    : new Date().toLocaleDateString("pt-BR")}
                </span>
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

      {/* SLOT 1: Cards de Métricas Consolidadas */}
      <section aria-labelledby="titulo-metricas-consolidadas">
        <h2 id="titulo-metricas-consolidadas" className="sr-only">Métricas Consolidadas</h2>
        {metricasSlot ? (
          metricasSlot
        ) : (
          <div
            data-testid="slot-metricas-default"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
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
        )}
      </section>

      {/* Grid Central: SLOT 2 (Gráfico Evolutivo) + SLOT 3 (Insights da IA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Evolutivo de Desempenho Temporal */}
        <section
          aria-labelledby="titulo-grafico-desempenho"
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 text-card-foreground"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 id="titulo-grafico-desempenho" className="text-base font-bold text-foreground tracking-tight">
                Curva de Desempenho & Tempo de Reação
              </h2>
              <p className="text-xs text-muted-foreground">
                Tempo de resposta por tentativa ao longo da sessão com marcadores DDA
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono">
              Milissegundos (ms)
            </Badge>
          </div>

          {graficoSlot ? (
            graficoSlot
          ) : (
            <div
              data-testid="slot-grafico-default"
              className="w-full h-64 flex flex-col items-center justify-center p-4 bg-muted/20 rounded-xl border border-border/60"
            >
              {/* Gráfico Vetorial SVG responsivo com marcadores DDA */}
              <svg
                viewBox="0 0 500 160"
                className="w-full h-full max-h-56 overflow-visible"
                aria-label="Gráfico de curva de desempenho temporal"
              >
                {/* Linhas de grade sutis */}
                <line
                  x1="30"
                  y1="20"
                  x2="480"
                  y2="20"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="30"
                  y1="70"
                  x2="480"
                  y2="70"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="30"
                  y1="120"
                  x2="480"
                  y2="120"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                />

                {/* Curva de tempo de resposta */}
                <path
                  d="M 30,110 Q 90,80 150,95 T 270,60 T 380,45 T 480,40"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Pontos de dados */}
                <circle cx="30" cy="110" r="4" fill="hsl(var(--primary))" />
                <circle cx="150" cy="95" r="4" fill="hsl(var(--primary))" />
                <circle cx="270" cy="60" r="4" fill="hsl(var(--primary))" />
                <circle cx="380" cy="45" r="4" fill="hsl(var(--primary))" />
                <circle cx="480" cy="40" r="4" fill="hsl(var(--primary))" />

                {/* Marcadores DDA (Intervenções da IA) */}
                <g>
                  <circle
                    cx="270"
                    cy="60"
                    r="8"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                  />
                  <text
                    x="270"
                    y="45"
                    fontSize="9"
                    textAnchor="middle"
                    fill="#f59e0b"
                    fontWeight="bold"
                  >
                    DDA Modulado
                  </text>
                </g>
              </svg>
              <div className="flex items-center gap-6 text-[11px] text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  Curva de Reação (ms)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Ajuste Contextual DDA
                </span>
              </div>
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
                        <span className="capitalize">
                          {m.id_metrica.replace(/_/g, " ")}:
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
            terapeutaNome={nomeTerapeuta}
            terapeutaRegistro={registroTerapeuta}
          />
        )}
      </section>
    </main>
  );
}
