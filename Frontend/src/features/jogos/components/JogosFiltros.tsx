import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { FiltrosJogos } from "../types";

interface JogosFiltrosProps {
  filtros: FiltrosJogos;
  onFiltroBusca: (busca: string) => void;
  onFiltroObjetivo: (objetivo: string) => void;
  objetivosDisponiveis: string[];
}

export function JogosFiltros({
  filtros,
  onFiltroBusca,
  onFiltroObjetivo,
  objetivosDisponiveis,
}: JogosFiltrosProps) {
  const [termoBusca, setTermoBusca] = useState(filtros.busca || "");

  // Sincroniza se o filtro externo mudar
  useEffect(() => {
    setTermoBusca(filtros.busca || "");
  }, [filtros.busca]);

  // Debounce de 400ms para digitação suave sem bloquear a UI com requisições constantes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (termoBusca !== (filtros.busca || "")) {
        onFiltroBusca(termoBusca);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [termoBusca, filtros.busca, onFiltroBusca]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onFiltroBusca(termoBusca);
    }
  };

  const handleLimparBusca = () => {
    setTermoBusca("");
    onFiltroBusca("");
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
      {/* BUSCA À ESQUERDA */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogo por nome ou objetivo..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 bg-card text-foreground border-border focus-visible:border-primary focus-visible:ring-primary/30"
        />
        {termoBusca && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLimparBusca}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* FILTROS À DIREITA */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* SELECT OBJETIVO TERAPÊUTICO */}
        <Select
          value={filtros.objetivo || "todos"}
          onValueChange={onFiltroObjetivo}
        >
          <SelectTrigger className="w-48 bg-card text-foreground border-border focus:border-primary">
            <SelectValue placeholder="Todos os objetivos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os objetivos</SelectItem>
            {objetivosDisponiveis.map((obj) => (
              <SelectItem key={obj} value={obj}>
                {obj}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
