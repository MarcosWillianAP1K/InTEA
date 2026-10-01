import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { FiltrosJogos, StatusInstalacao } from "../types";

interface JogosFiltrosProps {
  filtros: FiltrosJogos;
  onFiltroBusca: (busca: string) => void;
  onFiltroObjetivo: (objetivo: string) => void;
  onFiltroStatus?: (status: StatusInstalacao | "todos") => void;
  objetivosDisponiveis: string[];
}

export function JogosFiltros({
  filtros,
  onFiltroBusca,
  onFiltroObjetivo,
  onFiltroStatus,
  objetivosDisponiveis,
}: JogosFiltrosProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
      {/* BUSCA À ESQUERDA (igual a Pacientes) */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogo por nome ou objetivo..."
          value={filtros.busca || ""}
          onChange={(e) => onFiltroBusca(e.target.value)}
          className="pl-9 bg-card text-foreground border-border focus-visible:border-[#0b3294] focus-visible:ring-[#0b3294]/30"
        />
      </div>

      {/* FILTROS À DIREITA (igual a Pacientes) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* SELECT OBJETIVO TERAPÊUTICO */}
        <Select
          value={filtros.objetivo || "todos"}
          onValueChange={onFiltroObjetivo}
        >
          <SelectTrigger className="w-48 bg-card text-foreground border-border focus:border-[#0b3294]">
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

        {/* SELECT STATUS / INSTALAÇÃO */}
        {onFiltroStatus && (
          <Select
            value={filtros.status || "todos"}
            onValueChange={(v) => onFiltroStatus(v as StatusInstalacao | "todos")}
          >
            <SelectTrigger className="w-40 bg-card text-foreground border-border focus:border-[#0b3294]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="instalado">Instalado</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
