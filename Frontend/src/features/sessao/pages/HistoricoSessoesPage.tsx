"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Gamepad2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { sessaoService } from "../services/sessaoService";
import type { Sessao, FiltroSessaoDTO } from "../types/sessao.types";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "sonner";

/**
 * ============================================================================
 * PAGE: SESSION HISTORY (InTEA)
 * Displays historical sessions list with clinical filtering and pagination.
 * ============================================================================
 */
export function HistoricoSessoesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = Boolean(
    user?.is_super_admin ||
    (user as { role?: string })?.role === "super_admin"
  );

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todas");
  const [dataFiltro, setDataFiltro] = useState<string>("");
  const [verTodasAdmin, setVerTodasAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const carregarSessoes = async () => {
    try {
      setLoading(true);
      const filtros: FiltroSessaoDTO = {
        all: isSuperAdmin && verTodasAdmin ? true : undefined,
        status: statusFiltro !== "todas" ? statusFiltro : undefined,
        data: dataFiltro || undefined,
        page,
        limit,
      };

      const resposta = await sessaoService.listar(filtros);
      const lista = resposta.data || [];
      setSessoes(
        statusFiltro === "todas"
          ? lista.filter((s) => s.status_sessao !== "aguardando_pareamento")
          : lista,
      );
      if (resposta.meta) {
        setMeta(resposta.meta);
      }
    } catch {
      toast.error("Erro ao carregar histórico de sessões.");
    } finally {
      setLoading(false);
    }
  };

  // Resetar para página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [busca, statusFiltro, dataFiltro, verTodasAdmin]);

  useEffect(() => {
    void carregarSessoes();
  }, [page, limit, statusFiltro, dataFiltro, verTodasAdmin]);

  // Filtragem local complementar por nome do paciente ou jogo
  const sessoesFiltradas = useMemo(() => {
    if (!busca.trim()) return sessoes;
    const termo = busca.toLowerCase();
    return sessoes.filter((s) => {
      const nomePaciente = s.paciente?.nome?.toLowerCase() || "modo livre";
      const nomeJogo = s.jogo?.nome?.toLowerCase() || "";
      const pin = s.session_token?.toLowerCase() || "";
      return (
        nomePaciente.includes(termo) ||
        nomeJogo.includes(termo) ||
        pin.includes(termo)
      );
    });
  }, [sessoes, busca]);

  /**
   * Renders color-coded status badge pill according to Figma design system tokens (Figma 79:662).
   * Status Visualization: Maps 'finalizada'/'concluida' to green, 'cancelada' to red, and pending to neutral grey.
   *
   * @param status - Raw session status string
   * @returns Formatted status badge element
   */
  function renderBadgeStatus(status: string) {
    switch (status) {
      case "finalizada":
      case "concluida":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#6FFBBE] text-slate-900 shadow-xs">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completo</span>
          </span>
        );
      case "cancelada":
      case "expirada":
      case "interrompida_por_queda":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#BA1A1A] text-white shadow-xs">
            <XCircle className="h-3 w-3" />
            <span>Falha</span>
          </span>
        );
      case "pausada":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 shadow-xs">
            <span>Em Pausa</span>
          </span>
        );
      case "em_andamento":
      case "conectado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Em Andamento</span>
          </span>
        );
      case "aguardando_pareamento":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs">
            <Clock className="h-3 w-3" />
            <span>Aguardando</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E1E1E1] text-slate-800 shadow-xs">
            <Clock className="h-3 w-3" />
            <span>{status}</span>
          </span>
        );
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-7xl mx-auto py-2 pb-12">
      {/* Cabeçalho — Figma 77:2190 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Histórico de sessões
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              {isSuperAdmin && verTodasAdmin ? "Todas as Sessões (Admin)" : "Minhas Sessões"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Consulte telemetrias passadas, intervenções DDA e laudos clínicos gerados pela IA.
          </p>
        </div>

        {/* Toggle para Super Admin */}
        {isSuperAdmin && (
          <Button
            variant={verTodasAdmin ? "default" : "outline"}
            size="sm"
            onClick={() => setVerTodasAdmin(!verTodasAdmin)}
            className="text-xs font-semibold gap-2 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{verTodasAdmin ? "Exibindo Todas (Global)" : "Ver Todas as Sessões (Admin)"}</span>
          </Button>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na lista (paciente, jogo)..."
            className="pl-9 h-10 text-xs rounded-lg bg-background border-border"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtro de Status */}
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-full sm:w-40 h-10 text-xs rounded-lg bg-background border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              <SelectItem value="concluidas">Concluídas</SelectItem>
              <SelectItem value="pendentes">Pendentes</SelectItem>
              <SelectItem value="canceladas">Canceladas / Falha</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Data */}
          <div className="relative w-full sm:w-44">
            <Input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="h-10 text-xs rounded-lg bg-background border-border"
            />
          </div>

          {dataFiltro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDataFiltro("")}
              className="text-xs text-muted-foreground hover:text-foreground h-10"
            >
              Limpar data
            </Button>
          )}
        </div>
      </div>

      {/* Tabela historico — Figma 79:750 & Row historico 79:679 */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="w-72 text-xs font-bold text-foreground">Paciente</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Game</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Data</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-foreground pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                  Carregando histórico de atendimentos clínicos...
                </TableCell>
              </TableRow>
            ) : sessoesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                  Nenhuma sessão localizada com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              sessoesFiltradas.map((sessao) => {
                // Fallback defensivo para evitar TypeError em Modo Livre (RN01)
                const nomePaciente = sessao.paciente?.nome || "Modo Livre";
                const nomeJogo = sessao.jogo?.nome || "Jogo Terapêutico";
                const dataFormatada = sessao.data_hora_inicio
                  ? new Date(sessao.data_hora_inicio).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Data não registrada";

                return (
                  <TableRow
                    key={sessao.id}
                    className="hover:bg-muted/30 transition-colors border-b border-border/60"
                  >
                    {/* COLUNA 1: PACIENTE */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {nomePaciente.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate max-w-56">
                            {nomePaciente}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            PIN: {sessao.session_token || "N/I"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* COLUNA 2: GAME */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">
                          {nomeJogo}
                        </span>
                      </div>
                    </TableCell>

                    {/* COLUNA 3: DATA */}
                    <TableCell className="text-xs text-muted-foreground font-medium py-4">
                      {dataFormatada}
                    </TableCell>

                    {/* COLUNA 4: STATUS (Pill Figma 79:662) */}
                    <TableCell className="py-4">
                      {renderBadgeStatus(sessao.status_sessao)}
                    </TableCell>

                    {/* COLUNA 5: AÇÕES */}
                    <TableCell className="text-right py-4 pr-6">
                      {sessao.status_sessao === "em_andamento" || sessao.status_sessao === "conectado" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sessao/${sessao.id}/monitoramento`)}
                          className="h-8 px-3 text-xs font-semibold gap-1.5 border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-100 cursor-pointer"
                        >
                          <Activity className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Cockpit</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sessao/${sessao.id}/resultado`)}
                          className="h-8 px-3 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Relatório</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Barra de Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border px-6 py-4 rounded-xl shadow-xs">
        <div className="text-xs text-muted-foreground">
          {meta.total === 0 ? (
            <span>Nenhuma sessão para exibir</span>
          ) : (
            <span>
              Mostrando{" "}
              <strong className="text-foreground">
                {(meta.page - 1) * meta.limit + 1}
              </strong>{" "}
              a{" "}
              <strong className="text-foreground">
                {Math.min(meta.page * meta.limit, meta.total)}
              </strong>{" "}
              de <strong className="text-foreground">{meta.total}</strong> sessões
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Itens por página:</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-8 text-xs rounded-lg bg-background border-border">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 px-2 text-xs gap-1 border-border cursor-pointer disabled:opacity-50"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <span className="text-xs text-muted-foreground px-2">
              Página <strong className="text-foreground">{meta.page}</strong> de{" "}
              <strong className="text-foreground">{meta.totalPages || 1}</strong>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.totalPages || meta.totalPages === 0 || loading}
              className="h-8 px-2 text-xs gap-1 border-border cursor-pointer disabled:opacity-50"
              aria-label="Próxima página"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoricoSessoesPage;
