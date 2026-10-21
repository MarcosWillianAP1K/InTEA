"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Gamepad2,
  Play,
  RotateCcw,
  ShieldAlert,
  User,
  Activity,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { pacienteService } from "../services/paciente.service";
import type { Paciente } from "../types/paciente.types";
import type {
  MetricasEngajamentoGeral,
  ResumoJogoPaciente,
  HistoricoJogoDetalhado,
  FiltrosHistorico,
  SessaoHistoricoItem,
} from "../types/historico.types";
import { CardsEngajamentoGeral } from "../components/CardsEngajamentoGeral";
import { SeletorJogoHistorico } from "../components/SeletorJogoHistorico";
import { FiltrosHistoricoAvancado } from "../components/FiltrosHistoricoAvancado";
import { GraficoEvolucaoJogo } from "../components/GraficoEvolucaoJogo";
import { LinhaDoTempoSessoes } from "../components/LinhaDoTempoSessoes";

/**
 * ============================================================================
 * PÁGINA MESTRE: HistoricoPacientePage (Histórico Longitudinal e Engajamento)
 * Rota: /pacientes/:id/historico
 * Conformidade: RF15 (Prontuário Longitudinal), RF19 (Filtros Avançados),
 * RN01 (Expurgo de Modo Livre), RN02 (Tipagem Estrita), RN04 (Vínculo Clínico),
 * RN05 (Inalterabilidade / Soft Delete), RNF07 (Ergonomia e Alvos de Toque)
 * ============================================================================
 */

export function HistoricoPacientePage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Ações do store global de sessão para disparo de nova intervenção
  const abrirModalPreSessao = useSessionStore((s) => s.abrirModalPreSessao);
  const selecionarPaciente = useSessionStore((s) => s.selecionarPaciente);

  // Estados de dados principais
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [engajamento, setEngajamento] = useState<MetricasEngajamentoGeral | null>(null);
  const [jogos, setJogos] = useState<ResumoJogoPaciente[]>([]);
  const [jogoSelecionadoId, setJogoSelecionadoId] = useState<string | null>(null);
  const [historicoDetalhado, setHistoricoDetalhado] = useState<HistoricoJogoDetalhado | null>(null);
  const [sessoesLinhaDoTempo, setSessoesLinhaDoTempo] = useState<SessaoHistoricoItem[]>([]);

  // Estados de filtros temporais (RF19: padrão últimos 30 dias)
  const [filtros, setFiltros] = useState<FiltrosHistorico>({
    periodo: "30d",
  });

  // Estados de controle de UI
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [erroHttp, setErroHttp] = useState<{ status?: number; mensagem: string } | null>(null);

  /**
   * Carrega os dados cadastrais do paciente (cabeçalho da página).
   */
  const carregarDadosPaciente = useCallback(async (id: string) => {
    try {
      const dados = await pacienteService.buscarPorId(id);
      setPaciente(dados);
    } catch (err: unknown) {
      console.error("[HistoricoPacientePage.carregarDadosPaciente] Falha:", err);
    }
  }, []);

  /**
   * Carrega o histórico clínico longitudinal de acordo com o jogo selecionado e filtros.
   */
  const carregarHistorico = useCallback(
    async (id: string, jogoId: string | null, filtrosAtivos: FiltrosHistorico) => {
      try {
        setErroHttp(null);

        // Se houver jogo selecionado, consulta histórico detalhado daquele jogo
        if (jogoId) {
          const [resGeral, resDetalhe] = await Promise.all([
            pacienteService.buscarHistoricoGeral(id, filtrosAtivos),
            pacienteService.buscarHistoricoJogo(id, jogoId, filtrosAtivos),
          ]);

          setEngajamento(resGeral.engajamento);
          setJogos(resGeral.jogos || []);
          setHistoricoDetalhado(resDetalhe);
          setSessoesLinhaDoTempo(resDetalhe.sessoes || []);
        } else {
          // Visão Geral: Consulta engajamento geral e catálogo de jogos (sem dupla requisição)
          const resGeral = await pacienteService.buscarHistoricoGeral(id, filtrosAtivos);
          setEngajamento(resGeral.engajamento);
          setJogos(resGeral.jogos || []);
          setHistoricoDetalhado(null);
          setSessoesLinhaDoTempo([]);
        }
      } catch (err: unknown) {
        setIsRefreshing(false);
        setIsLoading(false);
        console.error("[HistoricoPacientePage.carregarHistorico] Erro:", err);
        const errObj = err as { response?: { status?: number; data?: { error?: string } }; message?: string };
        const status = errObj.response?.status;
        const msg = errObj.response?.data?.error || errObj.message || "Falha ao carregar histórico longitudinal.";

        setErroHttp({ status, mensagem: msg });
        if (status === 403) {
          toast.error("Acesso negado: terapeuta sem vínculo ativo nesta clínica (RN04).");
        } else {
          toast.error("Não foi possível carregar o histórico clínico.");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  // Efeito inicial e quando muda pacienteId
  useEffect(() => {
    if (!pacienteId) return;

    let isMounted = true;
    setIsLoading(true);

    void carregarDadosPaciente(pacienteId);
    void carregarHistorico(pacienteId, jogoSelecionadoId, filtros).finally(() => {
      if (!isMounted) return;
    });

    return () => {
      isMounted = false;
    };
  }, [pacienteId, carregarDadosPaciente, carregarHistorico, jogoSelecionadoId, filtros]);

  // Handlers reativos de interação
  const handleSelecionarJogo = (novoJogoId: string | null) => {
    setJogoSelecionadoId(novoJogoId);
    setIsRefreshing(true);
  };

  const handleAlterarFiltros = (novosFiltros: FiltrosHistorico) => {
    setFiltros(novosFiltros);
    setIsRefreshing(true);
  };

  const handleTentarNovamente = () => {
    if (!pacienteId) return;
    setIsLoading(true);
    void carregarHistorico(pacienteId, jogoSelecionadoId, filtros);
  };

  const handleIniciarNovaSessao = () => {
    if (!paciente) return;
    abrirModalPreSessao();
    selecionarPaciente({ id: paciente.id, nome: paciente.nome });
  };

  // Encontra o nome do jogo selecionado para exibição contextual
  const jogoAtual = jogos.find((j) => (j.jogo_id ? j.jogo_id === jogoSelecionadoId : String(j.id) === String(jogoSelecionadoId)));

  // ============================================================================
  // ESTADO 1: ERRO 403 FORBIDDEN (RN04 - Isolamento Institucional e Vínculo)
  // ============================================================================
  if (erroHttp?.status === 403) {
    return (
      <div
        data-testid="estado-erro-403"
        className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/pacientes/${pacienteId}`)}
            className="h-9 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Prontuário</span>
          </Button>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto shadow-sm">
          <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Acesso Negado ao Histórico Clínico (RN04)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você não possui vínculo ativo com este paciente na clínica atual. Por conformidade com as regras de
              segurança institucional e privacidade clínica, o histórico longitudinal não pode ser exibido.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/pacientes")}
            className="min-h-[44px] px-4 text-xs font-semibold cursor-pointer"
          >
            Retornar à Lista de Pacientes
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ESTADO 2: ERRO GENÉRICO COM RETRY
  // ============================================================================
  if (erroHttp && !isLoading && !engajamento) {
    return (
      <div
        data-testid="estado-erro-generico"
        className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/pacientes/${pacienteId}`)}
            className="h-9 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Prontuário</span>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 text-center flex flex-col items-center justify-center gap-4 max-w-md mx-auto shadow-2xs">
          <div className="h-12 w-12 rounded-full bg-muted/70 text-muted-foreground flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Falha ao Carregar Histórico</h3>
            <p className="text-xs text-muted-foreground">{erroHttp.mensagem}</p>
          </div>
          <Button
            onClick={handleTentarNovamente}
            size="sm"
            className="min-h-[44px] px-4 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tentar Novamente</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="pagina-historico-paciente"
      className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden"
    >
      {/* ========================================================================
          CABEÇALHO DA PÁGINA MESTRE (Identificação e Navegação)
          ======================================================================== */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/pacientes/${pacienteId}`)}
              data-testid="btn-voltar-perfil"
              className="h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Prontuário</span>
            </Button>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs font-semibold text-primary">Histórico Longitudinal</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              data-testid="titulo-paciente-historico"
              className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
            >
              {paciente?.nome || "Histórico do Paciente"}
            </h1>

            {paciente?.dados_clinicos?.diagnostico_base && (
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold py-0.5"
              >
                {paciente.dados_clinicos.diagnostico_base}
              </Badge>
            )}

            <Badge
              variant="secondary"
              className="text-[11px] font-medium bg-muted text-muted-foreground"
            >
              Prontuário #{pacienteId?.slice(0, 8)}
            </Badge>
          </div>
        </div>

        {/* Ações do Cabeçalho: Iniciar Intervenção Imediata */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            onClick={handleIniciarNovaSessao}
            data-testid="btn-nova-sessao-historico"
            className="min-h-[44px] px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer shadow-xs"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Iniciar Sessão</span>
          </Button>
        </div>
      </header>

      {/* ========================================================================
          1. CARDS DE ENGAJAMENTO GERAL (Universal para todos os jogos)
          ======================================================================== */}
      <section aria-label="Métricas Consolidadas de Engajamento">
        <CardsEngajamentoGeral
          engajamento={engajamento || undefined}
          isLoading={isLoading}
        />
      </section>

      {/* ========================================================================
          2. BARRA DE SELEÇÃO E FILTROS TEMPORAIS (RF15, RF19, RNF07)
          ======================================================================== */}
      <section aria-label="Seleção de Jogos e Filtros Temporais" className="space-y-3">
        {/* Seletor de Jogos (Visão Geral vs Jogos Específicos) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span>Contexto de Análise</span>
            </span>
            {isRefreshing && (
              <span className="text-[11px] text-muted-foreground animate-pulse">
                Atualizando métricas...
              </span>
            )}
          </div>

          <SeletorJogoHistorico
            jogos={jogos}
            jogoSelecionadoId={jogoSelecionadoId}
            onSelecionarJogo={handleSelecionarJogo}
            isLoading={isLoading}
          />
        </div>

        {/* Barra de Filtros Temporais (7d, 30d, 3m, todos, personalizado) */}
        <FiltrosHistoricoAvancado
          filtros={filtros}
          onAlterarFiltros={handleAlterarFiltros}
          isLoading={isLoading || isRefreshing}
        />
      </section>

      {/* ========================================================================
          3. ÁREA CENTRAL: EVOLUÇÃO DAS MÉTRICAS DO JOGO SELECIONADO
          ======================================================================== */}
      <section aria-label="Evolução Longitudinal de Métricas">
        {jogoSelecionadoId && historicoDetalhado ? (
          <GraficoEvolucaoJogo
            historicoJogo={historicoDetalhado}
            isLoading={isRefreshing}
          />
        ) : (
          /* Estado da Visão Geral: Catálogo Resumido de Jogos Experimentados */
          <div
            data-testid="painel-visao-geral-jogos"
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Jogos Terapêuticos Experimentados
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione um jogo no seletor acima para visualizar as curvas de evolução individualizadas (RN02).
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {jogos.length} {jogos.length === 1 ? "jogo ativo" : "jogos ativos"}
              </Badge>
            </div>

            {jogos.length === 0 && !isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>O paciente ainda não possui sessões registradas em nenhum game terapêutico.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleIniciarNovaSessao}
                  className="min-h-[44px] text-xs cursor-pointer"
                >
                  Criar Primeira Sessão de Jogo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {jogos.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => handleSelecionarJogo(String(j.id))}
                    data-testid={`card-catalogo-jogo-${j.id}`}
                    className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-2xs group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {j.nome}
                        </span>
                        {j.versao && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            v{j.versao}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Última intervenção:{" "}
                        {(j.ultima_sessao || j.data_ultima_sessao)
                          ? new Date(j.ultima_sessao || j.data_ultima_sessao!).toLocaleDateString("pt-BR")
                          : "Recente"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <span className="font-semibold text-primary">
                        {j.total_sessoes} {j.total_sessoes === 1 ? "sessão" : "sessões"}
                      </span>
                      <span className="text-[11px] text-muted-foreground group-hover:underline">
                        Ver Séries →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================
          4. LINHA DO TEMPO CRONOLÓGICA DE SESSÕES (RF15, RN01, RNF07)
          ======================================================================== */}
      <section aria-label="Linha do Tempo Cronológica">
        <LinhaDoTempoSessoes
          sessoes={sessoesLinhaDoTempo}
          isLoading={isLoading || isRefreshing}
          nomeJogoFiltro={jogoAtual?.nome}
        />
      </section>
    </div>
  );
}

export default HistoricoPacientePage;
