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
import { AvatarClinico } from "@/shared/components/AvatarClinico";
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

const LABELS_ENTIDADES: Record<string, string> = {
  autenticacao: "Autenticação",
  terapeuta: "Terapeuta",
  paciente: "Paciente",
  vinculo: "Vínculo",
  sessao: "Sessão",
  anotacao: "Anotação",
  clinica: "Clínica",
  jogo: "Jogo",
  exportacao: "Exportação",
};

const ENTIDADES_PADRAO = Object.keys(LABELS_ENTIDADES);

/**
 * Renders the administrative audit log table with column filtering and details dialog (RF07, RF08).
 */
export function TabelaAuditoria({
  eventos,
  loading = false,
}: TabelaAuditoriaProps) {
  const [busca, setBusca] = useState("");
  const [entidadeFiltro, setEntidadeFiltro] = useState("todas");
  const [terapeutaFiltro, setTerapeutaFiltro] = useState("todos");
  const [acaoFiltro, setAcaoFiltro] = useState("todas");
  const [dataFiltro, setDataFiltro] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [eventoSelecionado, setEventoSelecionado] = useState<EventoAuditoria | null>(null);
  const [copiado, setCopiado] = useState(false);

  const terapeutasDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    eventos.forEach((ev) => {
      if (ev.terapeuta_id && ev.terapeuta_nome) {
        map.set(ev.terapeuta_id, ev.terapeuta_nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [eventos]);

  const entidadesDisponiveis = useMemo(() => {
    const setEntidades = new Set<string>(ENTIDADES_PADRAO);
    eventos.forEach((ev) => {
      if (ev.entidade && ev.entidade.trim() !== "") {
        setEntidades.add(ev.entidade.trim());
      }
    });
    return Array.from(setEntidades);
  }, [eventos]);

  const acoesDisponiveis = useMemo(() => {
    const setAcoes = new Set<string>();
    eventos.forEach((ev) => setAcoes.add(ev.acao));
    return Array.from(setAcoes);
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const textoBusca = [
          ev.terapeuta_nome,
          ev.terapeuta_email,
          ev.terapeuta_id,
          ev.paciente_nome,
          ev.paciente_id,
          ev.entidade,
          ev.acao,
          ev.descricao,
          ev.ip,
          ev.sessao_id,
          ev.recurso_id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!textoBusca.includes(termo)) {
          return false;
        }
      }

      if (entidadeFiltro !== "todas" && ev.entidade !== entidadeFiltro) {
        return false;
      }

      if (terapeutaFiltro !== "todos") {
        if (ev.terapeuta_id !== terapeutaFiltro && ev.terapeuta_nome !== terapeutaFiltro) {
          return false;
        }
      }

      if (acaoFiltro !== "todas" && ev.acao !== acaoFiltro) {
        return false;
      }

      if (dataFiltro) {
        const dataEvento = ev.created_at.split("T")[0];
        if (dataEvento !== dataFiltro) {
          return false;
        }
      }

      return true;
    });
  }, [eventos, busca, entidadeFiltro, terapeutaFiltro, acaoFiltro, dataFiltro]);

  const totalRegistros = eventosFiltrados.length;
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1;
  const inicioIndice = (paginaAtual - 1) * itensPorPagina;
  const eventosPaginados = eventosFiltrados.slice(
    inicioIndice,
    inicioIndice + itensPorPagina
  );

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
    setEntidadeFiltro("todas");
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

  const formatarEntidade = (entidade?: string) => {
    if (!entidade) return "Sistema";
    return LABELS_ENTIDADES[entidade] || entidade.replace(/_/g, " ");
  };

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
    busca ||
      entidadeFiltro !== "todas" ||
      terapeutaFiltro !== "todos" ||
      acaoFiltro !== "todas" ||
      dataFiltro
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Barra de Filtros, Busca e Exportação */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            placeholder="Buscar por paciente, terapeuta, UUID, ação clínica ou IP..."
            className="pl-9 h-10 text-xs rounded-lg bg-background border-border"
            data-testid="input-busca-auditoria"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro por Entidade do Ecossistema */}
          <div className="w-full sm:w-40">
            <Select
              value={entidadeFiltro}
              onValueChange={(val) => {
                setEntidadeFiltro(val);
                setPaginaAtual(1);
              }}
            >
              <SelectTrigger
                className="h-10 text-xs rounded-lg bg-background border-border"
                data-testid="select-entidade-filtro"
              >
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as entidades</SelectItem>
                {entidadesDisponiveis.map((ent) => (
                  <SelectItem key={ent} value={ent}>
                    {formatarEntidade(ent)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="hidden sm:block h-6 w-px bg-border" aria-hidden="true" />

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

      {/* Tabela de Eventos */}
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
                    <p className="text-xs text-muted-foreground">
                      Tente alterar os termos da busca, entidade, terapeuta ou faixa de datas.
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
                const nomeResponsavel = evento.terapeuta_nome || "Sistema Automatizado";
                const subtextoTerapeuta =
                  evento.terapeuta_email ||
                  (evento.terapeuta_id ? `ID: ${evento.terapeuta_id.slice(0, 8)}...` : "Sem e-mail registrado");

                return (
                  <TableRow
                    key={evento.id}
                    className="hover:bg-muted/30 border-b border-border/60 transition-colors cursor-pointer"
                    onClick={() => setEventoSelecionado(evento)}
                    data-testid={`row-auditoria-${evento.id}`}
                  >
                    <TableCell className="text-xs font-medium text-foreground py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold">{formatarData(evento.created_at)}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatarEntidade(evento.entidade)} • UTC
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-foreground py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarClinico nome={nomeResponsavel} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate max-w-56">
                            {nomeResponsavel}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-56">
                            {subtextoTerapeuta}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {renderBadgeAcao(evento.acao)}
                        {evento.descricao && (
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-72">
                            {evento.descricao}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-foreground py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {evento.paciente_nome || "Modo Livre / Sem Paciente"}
                        </span>
                        {evento.sessao_id ? (
                          <span className="text-xs text-muted-foreground font-mono">
                            Sessão: {evento.sessao_id.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Ação institucional
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-foreground">
                          {evento.ip || "Não registrado"}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {evento.origem.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>

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

      {/* Modal de Detalhes Contextuais do Evento */}
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
                  <p className="font-mono text-xs break-all">{eventoSelecionado.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Data / Hora:</span>
                  <p className="font-medium">{formatarData(eventoSelecionado.created_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Entidade:</span>
                  <p className="font-medium">{formatarEntidade(eventoSelecionado.entidade)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">ID do Recurso:</span>
                  <p className="font-mono text-xs break-all">
                    {eventoSelecionado.recurso_id || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Terapeuta:</span>
                  <p className="font-medium">
                    {eventoSelecionado.terapeuta_nome || "Sistema Automatizado"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventoSelecionado.terapeuta_email || "Sem e-mail registrado"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground break-all mt-0.5">
                    ID: {eventoSelecionado.terapeuta_id || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Paciente:</span>
                  <p className="font-medium">{eventoSelecionado.paciente_nome || "Nenhum"}</p>
                  <p className="font-mono text-xs text-muted-foreground break-all mt-0.5">
                    ID: {eventoSelecionado.paciente_id || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Ação Registrada:</span>
                  <div className="mt-1">{renderBadgeAcao(eventoSelecionado.acao)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Canal de Origem:</span>
                  <p className="font-mono text-xs capitalize">{eventoSelecionado.origem}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Endereço IP:</span>
                  <p className="font-mono text-xs">{eventoSelecionado.ip || "Não registrado"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Sessão UUID:</span>
                  <p className="font-mono text-xs break-all">
                    {eventoSelecionado.sessao_id || "N/A"}
                  </p>
                </div>
              </div>

              {eventoSelecionado.user_agent && (
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border">
                  <span className="text-muted-foreground font-semibold">User Agent / Dispositivo:</span>
                  <p className="font-mono text-xs break-all mt-1">{eventoSelecionado.user_agent}</p>
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
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-2"
                  >
                    {copiado ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiado ? "Copiado!" : "Copiar JSON"}</span>
                  </Button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-100 dark:bg-slate-900 font-mono text-xs overflow-x-auto max-h-48 leading-relaxed border border-border/40">
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
