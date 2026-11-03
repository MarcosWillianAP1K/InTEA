"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  FileSpreadsheet,
  FileJson,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Clock,
  Info,
  Copy,
  Check,
  X,
} from "lucide-react";
import type { EventoAuditoria } from "../types/admin.types";
import { auditoriaAdminService } from "../services/auditoriaAdmin.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";

export interface TabelaAuditoriaProps {
  eventos: EventoAuditoria[];
  loading?: boolean;
  onRecarregar?: () => void | Promise<void>;
}

/**
 * Renders the administrative audit log table with column filtering and details drawer (RF08).
 * Institutional Audit Trail (RF08, RNF06): Displays timestamp, therapist, action, IP, and parameters.
 *
 * @param props - Table properties containing audit events, pagination, and selection callbacks
 * @returns Interactive audit table component
 */
export function TabelaAuditoria({
  eventos,
  loading = false,
}: TabelaAuditoriaProps) {
  // Filtros locais
  const [busca, setBusca] = useState("");
  const [terapeutaFiltro, setTerapeutaFiltro] = useState("todos");
  const [acaoFiltro, setAcaoFiltro] = useState("todas");
  const [dataFiltro, setDataFiltro] = useState("");

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // Modal de Detalhes e Copiar
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoAuditoria | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Lista de terapeutas únicos para o dropdown
  const terapeutasDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    eventos.forEach((ev) => {
      if (ev.terapeuta_id && ev.terapeuta_nome) {
        map.set(ev.terapeuta_id, ev.terapeuta_nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [eventos]);

  // Lista de ações únicas para o dropdown
  const acoesDisponiveis = useMemo(() => {
    const setAcoes = new Set<string>();
    eventos.forEach((ev) => setAcoes.add(ev.acao));
    return Array.from(setAcoes);
  }, [eventos]);

  // Filtragem dos eventos
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      // 1. Busca textual
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const textoBusca = [
          ev.terapeuta_nome,
          ev.terapeuta_email,
          ev.paciente_nome,
          ev.acao,
          ev.descricao,
          ev.ip,
          ev.sessao_id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!textoBusca.includes(termo)) {
          return false;
        }
      }

      // 2. Filtro por terapeuta
      if (terapeutaFiltro !== "todos") {
        if (ev.terapeuta_id !== terapeutaFiltro && ev.terapeuta_nome !== terapeutaFiltro) {
          return false;
        }
      }

      // 3. Filtro por ação clínica
      if (acaoFiltro !== "todas") {
        if (ev.acao !== acaoFiltro) {
          return false;
        }
      }

      // 4. Filtro por data
      if (dataFiltro) {
        const dataEvento = ev.created_at.split("T")[0];
        if (dataEvento !== dataFiltro) {
          return false;
        }
      }

      return true;
    });
  }, [eventos, busca, terapeutaFiltro, acaoFiltro, dataFiltro]);

  // Cálculos de paginação
  const totalRegistros = eventosFiltrados.length;
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1;
  const inicioIndice = (paginaAtual - 1) * itensPorPagina;
  const eventosPaginados = eventosFiltrados.slice(
    inicioIndice,
    inicioIndice + itensPorPagina
  );

  // Ações de exportação
  const handleExportarCSV = () => {
    if (eventosFiltrados.length === 0) {
      toast.warning("Não há registros de auditoria para exportar.");
      return;
    }
    auditoriaAdminService.exportarCSV(eventosFiltrados);
    toast.success(`${eventosFiltrados.length} registros exportados em formato CSV.`);
  };

  const handleExportarJSON = () => {
    if (eventosFiltrados.length === 0) {
      toast.warning("Não há registros de auditoria para exportar.");
      return;
    }
    auditoriaAdminService.exportarJSON(eventosFiltrados);
    toast.success(`${eventosFiltrados.length} registros exportados em formato JSON.`);
  };

  const handleLimparFiltros = () => {
    setBusca("");
    setTerapeutaFiltro("todos");
    setAcaoFiltro("todas");
    setDataFiltro("");
    setPaginaAtual(1);
  };

  const handleCopiarJSON = async () => {
    if (!eventoSelecionado) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(eventoSelecionado.detalhes_json, null, 2)
      );
      setCopiado(true);
      toast.success("Payload JSON copiado para a área de transferência!");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o payload.");
    }
  };

  const formatarData = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  /**
   * Renders color-coded badge pill for clinical audit actions conforming to Figma design specifications.
   * Visual Governance (RF08): Distinguishes session lifecycle, medical record access, and security alerts.
   *
   * @param acao - Audit action identifier
   * @returns Styled badge element
   */
  const renderBadgeAcao = (acao: string) => {
    switch (acao) {
      case "acesso_prontuario":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
            <Eye className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Acesso a Prontuário</span>
          </span>
        );
      case "sessao_criada":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
            <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Sessão Criada</span>
          </span>
        );
      case "dispositivo_pareado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Dispositivo Pareado</span>
          </span>
        );
      case "sessao_finalizada":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#6FFBBE] text-slate-900 shadow-2xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sessão Finalizada</span>
          </span>
        );
      case "intervencao_dda":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
            <Activity className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Intervenção DDA</span>
          </span>
        );
      case "tentativa_acesso_negado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#BA1A1A] text-white shadow-2xs">
            <ShieldAlert className="w-3 h-3" />
            <span>Bloqueio (403)</span>
          </span>
        );
      case "exportacao_laudo":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
            <FileSpreadsheet className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Exportação de Laudo</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <span>{acao.replace(/_/g, " ")}</span>
          </span>
        );
    }
  };

  const temFiltrosAtivos = Boolean(
    busca || terapeutaFiltro !== "todos" || acaoFiltro !== "todas" || dataFiltro
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Barra de Filtros, Busca e Exportação (Padrão InTEA) */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        {/* Campo de Busca Textual */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            placeholder="Buscar por paciente, terapeuta, ação clínica ou IP..."
            className="pl-9 h-10 text-xs rounded-lg bg-background border-border"
            data-testid="input-busca-auditoria"
          />
        </div>

        {/* Controles de Filtros e Botões */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro por Terapeuta */}
          <div className="w-full sm:w-44">
            <Select
              value={terapeutaFiltro}
              onValueChange={(val) => {
                setTerapeutaFiltro(val);
                setPaginaAtual(1);
              }}
            >
              <SelectTrigger
                className="h-10 text-xs rounded-lg bg-background border-border"
                data-testid="select-terapeuta-filtro"
              >
                <SelectValue placeholder="Terapeuta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os terapeutas</SelectItem>
                {terapeutasDisponiveis.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Tipo de Ação Clínica */}
          <div className="w-full sm:w-44">
            <Select
              value={acaoFiltro}
              onValueChange={(val) => {
                setAcaoFiltro(val);
                setPaginaAtual(1);
              }}
            >
              <SelectTrigger
                className="h-10 text-xs rounded-lg bg-background border-border"
                data-testid="select-acao-filtro"
              >
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as ações</SelectItem>
                {acoesDisponiveis.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Data */}
          <div className="relative w-full sm:w-36">
            <Input
              type="date"
              value={dataFiltro}
              onChange={(e) => {
                setDataFiltro(e.target.value);
                setPaginaAtual(1);
              }}
              className="h-10 text-xs rounded-lg bg-background border-border"
              data-testid="input-data-filtro"
            />
          </div>

          {/* Botão Limpar Filtros */}
          {temFiltrosAtivos && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLimparFiltros}
              className="h-10 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1 rounded-lg"
              data-testid="botao-limpar-filtros"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </Button>
          )}

          {/* Divisor Visual */}
          <div className="hidden sm:block h-6 w-px bg-border" aria-hidden="true" />

          {/* Botões de Exportação Estruturada (CSV e JSON) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarCSV}
              className="h-10 text-xs font-semibold gap-1.5 border-border hover:bg-surface-alt rounded-lg cursor-pointer"
              data-testid="botao-exportar-csv"
              title="Exportar registros filtrados em formato de planilha CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarJSON}
              className="h-10 text-xs font-semibold gap-1.5 border-border hover:bg-surface-alt rounded-lg cursor-pointer"
              data-testid="botao-exportar-json"
              title="Exportar registros filtrados em formato estruturado JSON"
            >
              <FileJson className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>JSON</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Eventos — Padrão Row Figma InTEA */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="text-xs font-bold text-foreground w-44">
                Data / Hora
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground">
                Terapeuta Responsável
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground">
                Ação Clínica
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground">
                Paciente / Sessão
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground">
                Origem & IP
              </TableHead>
              <TableHead className="text-right text-xs font-bold text-foreground pr-6 w-20">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Activity className="h-5 w-5 animate-spin text-primary" />
                    <span>Carregando trilha de auditoria forense...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : eventosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Info className="h-6 w-6 text-muted-foreground/60" />
                    <span className="font-medium text-foreground">
                      Nenhum registro de auditoria corresponde aos filtros selecionados.
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Tente alterar os termos da busca, o terapeuta ou a faixa de datas.
                    </p>
                    {temFiltrosAtivos && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleLimparFiltros}
                        className="text-xs text-primary mt-1"
                      >
                        Redefinir filtros de busca
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              eventosPaginados.map((evento) => {
                const inicialNome = evento.terapeuta_nome
                  ? evento.terapeuta_nome.replace("Dr. ", "").replace("Dra. ", "").slice(0, 2).toUpperCase()
                  : "ST";

                return (
                  <TableRow
                    key={evento.id}
                    className="hover:bg-muted/30 border-b border-border/60 transition-colors cursor-pointer"
                    onClick={() => setEventoSelecionado(evento)}
                    data-testid={`row-auditoria-${evento.id}`}
                  >
                    {/* Data / Hora */}
                    <TableCell className="text-xs font-medium text-foreground py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold">{formatarData(evento.created_at)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">UTC</span>
                      </div>
                    </TableCell>

                    {/* Terapeuta */}
                    <TableCell className="text-xs text-foreground py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {inicialNome}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate max-w-56">
                            {evento.terapeuta_nome || "Sistema Automatizado"}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate max-w-56">
                            {evento.terapeuta_email || "sistema@intea.com.br"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Ação Clínica */}
                    <TableCell className="text-xs py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {renderBadgeAcao(evento.acao)}
                        {evento.descricao && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">
                            {evento.descricao}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Paciente / Sessão */}
                    <TableCell className="text-xs text-foreground py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {evento.paciente_nome || "Modo Livre / Sem Paciente"}
                        </span>
                        {evento.sessao_id ? (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Sessão: {evento.sessao_id.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            Ação institucional
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Origem & IP */}
                    <TableCell className="text-xs py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-foreground">
                          {evento.ip || "127.0.0.1"}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {evento.origem.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>

                    {/* Ação Ver Detalhes */}
                    <TableCell className="text-right py-3.5 pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventoSelecionado(evento);
                        }}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-surface-alt text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Ver detalhes contextuais"
                        aria-label="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Rodapé da Tabela: Paginação Padrão InTEA */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border bg-card gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Exibindo</span>
            <Select
              value={String(itensPorPagina)}
              onValueChange={(val) => {
                setItensPorPagina(Number(val));
                setPaginaAtual(1);
              }}
            >
              <SelectTrigger className="h-8 w-16 text-xs rounded-md bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>de {totalRegistros} eventos auditados</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaAtual <= 1 || loading}
                className="h-8 w-8 p-0 cursor-pointer rounded-lg border-border hover:bg-surface-alt"
                aria-label="Página anterior"
                data-testid="botao-pagina-anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))}
                disabled={paginaAtual >= totalPaginas || loading}
                className="h-8 w-8 p-0 cursor-pointer rounded-lg border-border hover:bg-surface-alt"
                aria-label="Próxima página"
                data-testid="botao-pagina-proxima"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Dialog de Detalhes Contextuais do Evento */}
      <Dialog
        open={Boolean(eventoSelecionado)}
        onOpenChange={(aberto) => {
          if (!aberto) setEventoSelecionado(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Eye className="h-4 w-4 text-primary" />
              Detalhes do Evento de Auditoria
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registro forense append-only com carimbo UTC e assinatura digital.
            </DialogDescription>
          </DialogHeader>

          {eventoSelecionado && (
            <div className="flex flex-col gap-4 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-surface-alt dark:bg-surface-highlight border border-border">
                <div>
                  <span className="text-muted-foreground font-semibold">ID do Evento:</span>
                  <p className="font-mono text-[11px] break-all">{eventoSelecionado.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Data / Hora:</span>
                  <p className="font-medium">{formatarData(eventoSelecionado.created_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Terapeuta:</span>
                  <p className="font-medium">{eventoSelecionado.terapeuta_nome || "Sistema"}</p>
                  <p className="text-[11px] text-muted-foreground">{eventoSelecionado.terapeuta_email || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Paciente:</span>
                  <p className="font-medium">{eventoSelecionado.paciente_nome || "Nenhum"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Ação Registrada:</span>
                  <div className="mt-1">{renderBadgeAcao(eventoSelecionado.acao)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Canal de Origem:</span>
                  <p className="font-mono text-[11px] capitalize">{eventoSelecionado.origem}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Endereço IP:</span>
                  <p className="font-mono text-[11px]">{eventoSelecionado.ip || "127.0.0.1"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Sessão UUID:</span>
                  <p className="font-mono text-[11px] break-all">{eventoSelecionado.sessao_id || "N/A"}</p>
                </div>
              </div>

              {eventoSelecionado.user_agent && (
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border">
                  <span className="text-muted-foreground font-semibold">User Agent / Dispositivo:</span>
                  <p className="font-mono text-[11px] break-all mt-1">{eventoSelecionado.user_agent}</p>
                </div>
              )}

              {eventoSelecionado.descricao && (
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border">
                  <span className="text-muted-foreground font-semibold">Descrição do Evento:</span>
                  <p className="mt-1 text-foreground leading-relaxed">{eventoSelecionado.descricao}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">
                    Payload JSON (Metadados Imutáveis):
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopiarJSON}
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-2"
                  >
                    {copiado ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiado ? "Copiado!" : "Copiar JSON"}</span>
                  </Button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-100 dark:bg-slate-900 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed border border-border/40">
                  {JSON.stringify(eventoSelecionado.detalhes_json, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TabelaAuditoria;
