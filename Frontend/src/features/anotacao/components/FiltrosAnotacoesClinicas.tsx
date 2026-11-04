import { useState, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import type { FiltroAnotacaoDTO } from "../types/anotacao.types";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Search,
  X,
  User,
  Layers,
  Eye,
} from "lucide-react";

export interface FiltrosAnotacoesClinicasProps {
  filtros: FiltroAnotacaoDTO;
  onFiltrosChange: (novosFiltros: FiltroAnotacaoDTO) => void;
  autoresDisponiveis?: Array<{ id: string; nome: string }>;
  desabilitado?: boolean;
  className?: string;
}

/**
 * ============================================================================
 * COMPONENTE: FiltrosAnotacoesClinicas
 * Conformidade: RF16 (Prontuário e Anotações), RF19 (Filtros Longitudinais),
 *              RN05 (Visualização de Inativos), RNF07 (Acessibilidade)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */
/**
 * Filter controls bar for longitudinal clinical notes in patient health records (RF19).
 * Query Filtering: Provides full-text search, therapist author dropdown, date interval, and status filters.
 *
 * @param props - Component properties containing filter state and change dispatcher
 * @returns Clinical note filters toolbar component
 */
export function FiltrosAnotacoesClinicas({
  filtros,
  onFiltrosChange,
  autoresDisponiveis = [],
  desabilitado = false,
  className = "",
}: FiltrosAnotacoesClinicasProps) {
  // Estado local para digitação fluida sem engasgos ou submissão a cada caractere
  const [termoBusca, setTermoBusca] = useState(filtros.busca || "");

  // Sincroniza estado local se o filtro externo for resetado
  useEffect(() => {
    setTermoBusca(filtros.busca || "");
  }, [filtros.busca]);

  // Debounce de 400ms para aplicar o termo de busca sem travar a interface
  useEffect(() => {
    const timer = setTimeout(() => {
      if (termoBusca !== (filtros.busca || "")) {
        onFiltrosChange({
          ...filtros,
          busca: termoBusca,
          page: 1,
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [termoBusca, filtros, onFiltrosChange]);

  const temFiltroAtivo = Boolean(
    filtros.busca ||
      filtros.terapeutaId ||
      filtros.somenteSemSessao !== undefined ||
      filtros.incluirInativos ||
      filtros.dataInicio ||
      filtros.dataFim,
  );

  function handleBuscaChange(e: ChangeEvent<HTMLInputElement>) {
    setTermoBusca(e.target.value);
  }

  function handleBuscaKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (termoBusca !== (filtros.busca || "")) {
        onFiltrosChange({
          ...filtros,
          busca: termoBusca,
          page: 1,
        });
      }
    }
  }

  function handleLimparBusca() {
    setTermoBusca("");
    onFiltrosChange({ ...filtros, busca: "", page: 1 });
  }

  function handleOrigemChange(e: ChangeEvent<HTMLSelectElement>) {
    const valor = e.target.value;
    if (valor === "geral") {
      onFiltrosChange({
        ...filtros,
        somenteSemSessao: true,
        sessao_id: undefined,
        page: 1,
      });
    } else if (valor === "sessao") {
      onFiltrosChange({
        ...filtros,
        somenteSemSessao: false,
        page: 1,
      });
    } else {
      onFiltrosChange({
        ...filtros,
        somenteSemSessao: undefined,
        page: 1,
      });
    }
  }

  function handleAutorChange(e: ChangeEvent<HTMLSelectElement>) {
    const valor = e.target.value;
    onFiltrosChange({
      ...filtros,
      terapeutaId: valor ? valor : undefined,
      page: 1,
    });
  }

  function handleToggleInativos(e: ChangeEvent<HTMLInputElement>) {
    onFiltrosChange({
      ...filtros,
      incluirInativos: e.target.checked,
      page: 1,
    });
  }

  function handleLimparFiltros() {
    onFiltrosChange({
      paciente_id: filtros.paciente_id,
      page: 1,
    });
  }

  const valorOrigem =
    filtros.somenteSemSessao === true
      ? "geral"
      : filtros.somenteSemSessao === false
      ? "sessao"
      : "todas";

  return (
    <div
      data-testid="filtros-anotacoes-clinicas"
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 shadow-xs ${className}`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Campo de Busca Textual */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            data-testid="input-busca-anotacao"
            placeholder="Buscar por termo clínico, sintoma ou palavra-chave..."
            value={termoBusca}
            onChange={handleBuscaChange}
            onKeyDown={handleBuscaKeyDown}
            disabled={desabilitado}
            className="pl-9.5 pr-8 min-h-11 rounded-xl bg-background border-border text-sm"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={handleLimparBusca}
              disabled={desabilitado}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              title="Limpar busca"
              aria-label="Limpar termo de busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Seletor de Origem (Gerais vs Sessão) */}
        <div className="relative min-w-[170px]">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            data-testid="select-filtro-origem"
            value={valorOrigem}
            onChange={handleOrigemChange}
            disabled={desabilitado}
            className="w-full pl-9 pr-8 min-h-[44px] rounded-xl border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="todas">Todas as Origens</option>
            <option value="geral">Prontuário Geral</option>
            <option value="sessao">Vinculadas a Sessão</option>
          </select>
        </div>

        {/* Filtro por Intervalo de Datas (RF19) */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Input
            type="date"
            data-testid="input-filtro-data-inicio"
            title="Data de Início"
            value={filtros.dataInicio || ""}
            onChange={(e) =>
              onFiltrosChange({
                ...filtros,
                dataInicio: e.target.value || undefined,
                page: 1,
              })
            }
            disabled={desabilitado}
            className="min-h-[44px] min-w-[125px] rounded-xl bg-background border-border text-xs"
          />
          <span>até</span>
          <Input
            type="date"
            data-testid="input-filtro-data-fim"
            title="Data de Fim"
            value={filtros.dataFim || ""}
            onChange={(e) =>
              onFiltrosChange({
                ...filtros,
                dataFim: e.target.value || undefined,
                page: 1,
              })
            }
            disabled={desabilitado}
            className="min-h-[44px] min-w-[125px] rounded-xl bg-background border-border text-xs"
          />
        </div>

        {/* Seletor de Especialista / Autor (RF21) */}
        {autoresDisponiveis.length > 0 && (
          <div className="relative min-w-[200px]">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              data-testid="select-filtro-autor"
              value={filtros.terapeutaId || ""}
              onChange={handleAutorChange}
              disabled={desabilitado}
              className="w-full pl-9 pr-8 min-h-[44px] rounded-xl border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Todos os Especialistas</option>
              {autoresDisponiveis.map((autor) => (
                <option key={autor.id} value={autor.id}>
                  {autor.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Linha Inferior: Opção de Inativos e Botão de Limpar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="checkbox-incluir-inativos"
            checked={Boolean(filtros.incluirInativos)}
            onChange={handleToggleInativos}
            disabled={desabilitado}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
          />
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Exibir anotações inativas (Histórico)</span>
        </label>

        {temFiltroAtivo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLimparFiltros}
            disabled={desabilitado}
            className="min-h-11 min-w-11 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            data-testid="botao-limpar-filtros"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );
}

export default FiltrosAnotacoesClinicas;
