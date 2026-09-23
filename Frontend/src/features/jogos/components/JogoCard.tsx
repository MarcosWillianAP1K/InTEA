import { Play } from "lucide-react";
import type { Jogo } from "../types";

interface JogoCardProps {
  jogo: Jogo;
  onIniciarSessao: (jogo: Jogo) => void;
  onModoLivre: (jogo: Jogo) => void;
}

export function JogoCard({
  jogo,
  onIniciarSessao,
  onModoLivre,
}: JogoCardProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Lado Esquerdo: Imagem + Detalhes do Jogo */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-20 shrink-0-hidden rounded-xl bg-slate-100 border border-slate-100 flex items-center justify-center">
          {jogo.bannerUrl ? (
            <img
              src={jogo.bannerUrl}
              alt={jogo.titulo}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-400 font-semibold">InTEA</span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800">
              {jogo.titulo}
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              v{jogo.versao}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">
            {jogo.descricaoClinica}
          </p>
        </div>
      </div>

      {/* Lado Direito: Ações */}
      <div className="flex w-full sm:w-auto items-center gap-3">
        <button
          type="button"
          onClick={() => onModoLivre(jogo)}
          className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-white px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
        >
          <Play className="h-3.5 w-3.5 fill-current text-blue-600" />
          Modo Livre
        </button>

        <button
          type="button"
          onClick={() => onIniciarSessao(jogo)}
          className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-950"
        >
          <span className="text-sm leading-none">♟</span>
          Iniciar Sessão
        </button>
      </div>
    </div>
  );
}
