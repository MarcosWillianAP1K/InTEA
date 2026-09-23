import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/layout/dashboardLayout";
import type { Jogo, FiltrosJogos } from "../types";
import { jogosService, JOGOS_MOCK } from "../services/jogosService";
import { JogoCard } from "../components/JogoCard";
import { JogosFiltros } from "../components/JogosFiltros";

export function BibliotecaJogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosJogos>({
    busca: "",
    objetivo: "todos",
    status: "todos",
  });

  const objetivosDisponiveis = useMemo(() => {
    const list = JOGOS_MOCK.map((j) => j.objetivoTerapeutico);
    return Array.from(new Set(list));
  }, []);

  useEffect(() => {
    async function carregarJogos() {
      setLoading(true);
      try {
        const dados = await jogosService.listar(filtros);
        setJogos(dados);
      } catch {
        toast.error("Erro ao carregar a biblioteca de jogos");
      } finally {
        setLoading(false);
      }
    }

    carregarJogos();
  }, [filtros]);

  function handleIniciarSessao(jogo: Jogo) {
    toast.success(`A iniciar sessão clínica com "${jogo.titulo}"`);
  }

  function handleModoLivre(jogo: Jogo) {
    toast.info(
      `"${jogo.titulo}" aberto em Modo Livre (sem gravação de prontuário)`,
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-1 flex-col gap-6 p-6 max-w-7xl w-full">
        {/* Cabeçalho com título, subtítulo e filtro */}
        <JogosFiltros
          filtros={filtros}
          onFiltroObjetivo={(objetivo) =>
            setFiltros((prev) => ({ ...prev, objetivo }))
          }
          objetivosDisponiveis={objetivosDisponiveis}
        />

        {/* Lista de Jogos */}
        {loading ? (
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-2xl bg-slate-100 border border-slate-100"
              />
            ))}
          </div>
        ) : jogos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
            Nenhum jogo encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {jogos.map((jogo) => (
              <JogoCard
                key={jogo.id}
                jogo={jogo}
                onIniciarSessao={handleIniciarSessao}
                onModoLivre={handleModoLivre}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
