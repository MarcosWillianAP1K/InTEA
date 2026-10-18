import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import type { Jogo, FiltrosJogos } from "@/features/jogos/types";
import { jogosService, JOGOS_MOCK } from "@/features/jogos/services/jogosService";
import { JogoCard } from "@/features/jogos/components/JogoCard";
import { JogosFiltros } from "@/features/jogos/components/JogosFiltros";
import { useSessionStore } from "@/features/sessao";
import { ModalPreSessao } from "@/overlays/ModalPreSessao";

export function BibliotecaJogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosJogos>({
    busca: "",
    objetivo: "todos",
  });

  const abrirModalPreSessao = useSessionStore((state) => state.abrirModalPreSessao);

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
    abrirModalPreSessao({
      id: jogo.id,
      titulo: jogo.titulo,
    });
    toast.info(`Configurando sessão clínica para "${jogo.titulo}"`);
  }

  function handleModoLivre(jogo: Jogo) {
    toast.info(
      `"${jogo.titulo}" aberto em Modo Livre (sem gravação de prontuário)`,
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 w-full mx-auto">
      {/* BARRA DE FILTROS E BUSCA */}
      <JogosFiltros
        filtros={filtros}
        onFiltroBusca={(busca) => setFiltros((prev) => ({ ...prev, busca }))}
        onFiltroObjetivo={(objetivo) =>
          setFiltros((prev) => ({ ...prev, objetivo }))
        }
        objetivosDisponiveis={objetivosDisponiveis}
      />

      {/* LISTA DE JOGOS */}
      {loading ? (
        <div className="flex flex-col gap-3.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-2xl bg-muted/60 border border-border"
            />
          ))}
        </div>
      ) : jogos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center text-sm text-muted-foreground">
          Nenhum jogo encontrado para os filtros selecionados.
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

      {/* Modal de Pré-Sessão e Pareamento Remoto */}
      <ModalPreSessao />
    </div>
  );
}

export default BibliotecaJogosPage;
