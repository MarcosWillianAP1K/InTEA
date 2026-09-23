import { SlidersHorizontal } from "lucide-react";
import type { FiltrosJogos } from "../types";

interface JogosFiltrosProps {
  filtros: FiltrosJogos;
  onFiltroObjetivo: (objetivo: string) => void;
  objetivosDisponiveis: string[];
}

export function JogosFiltros({
  filtros,
  onFiltroObjetivo,
  objetivosDisponiveis,
}: JogosFiltrosProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Título e Subtítulo clínicos conforme o design */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Biblioteca de Jogos
        </h1>
        <p className="text-sm text-slate-500">
          Selecione uma atividade para iniciar a sessão clínica.
        </p>
      </div>

      {/* Botão e menu de seleção "Filtrar por..." */}
      <div className="relative inline-block self-start sm:self-auto">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm text-xs font-medium text-slate-600 transition hover:border-slate-300">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={filtros.objetivo ?? "todos"}
            onChange={(e) => onFiltroObjetivo(e.target.value)}
            className="bg-transparent outline-none cursor-pointer pr-2 text-xs font-medium text-slate-700"
          >
            <option value="todos">Filtrar por...</option>
            {objetivosDisponiveis.map((obj) => (
              <option key={obj} value={obj}>
                {obj}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
