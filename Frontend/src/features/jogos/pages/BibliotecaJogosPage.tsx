import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/layout/dashboardLayout";
import type { Jogo, FiltrosJogos } from "../types";
import { jogosService, JOGOS_MOCK } from "../services/jogosService";
import { JogoCard } from "../components/JogoCard";
import { JogosFiltros } from "../components/JogosFiltros";
import { useSessionStore, ModalPreSessao } from "@/features/sessao";
import { Gamepad2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

export function BibliotecaJogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosJogos>({
    busca: "",
    objetivo: "todos",
    status: "todos",
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
    <DashboardLayout>
      <div className="flex flex-1 flex-col gap-6 mt-4  w-full mx-auto">
      

        {/* BARRA DE FILTROS E BUSCA */}
        <JogosFiltros
          filtros={filtros}
          onFiltroBusca={(busca) => setFiltros((prev) => ({ ...prev, busca }))}
          onFiltroObjetivo={(objetivo) =>
            setFiltros((prev) => ({ ...prev, objetivo }))
          }
          onFiltroStatus={(status) => setFiltros((prev) => ({ ...prev, status }))}
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
      </div>

      {/* Modal de Pré-Sessão e Pareamento Remoto (Sprint 8) */}
      <ModalPreSessao />
    </DashboardLayout>
  );
}

