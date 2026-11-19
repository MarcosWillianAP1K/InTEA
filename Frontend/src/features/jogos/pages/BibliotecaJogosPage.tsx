import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Jogo, FiltrosJogos } from "../types";
import { jogosService } from "../services/jogos.service";
import { JogoCard } from "../components/JogoCard";
import { JogosFiltros } from "../components/JogosFiltros";
import { useSessionStore } from "@/features/sessao";
import { sessaoService } from "@/features/sessao/services/sessao.service";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Cast, Copy, Check, X } from "lucide-react";

interface SessaoModoLivreAtiva {
  jogo: Jogo;
  codigoPareamento: string;
  sessaoId?: string;
}

export function BibliotecaJogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosJogos>({
    busca: "",
    objetivo: "todos",
  });
  const [sessaoLivre, setSessaoLivre] = useState<SessaoModoLivreAtiva | null>(null);
  const [copiadoLivre, setCopiadoLivre] = useState(false);

  const [objetivosCatalogo, setObjetivosCatalogo] = useState<string[]>([]);

  const abrirModalPreSessao = useSessionStore((state) => state.abrirModalPreSessao);

  useEffect(() => {
    async function carregarJogos() {
      setLoading(true);
      try {
        const dados = await jogosService.listar(filtros);
        setJogos(dados);

        const semFiltros =
          !(filtros.busca ?? "").trim() &&
          (!filtros.objetivo || filtros.objetivo === "todos");

        const extraidos = dados
          .map(
            (j) =>
              j.objetivo_clinico ||
              j.manifesto?.objetivo_clinico ||
              j.manifesto_json?.objetivo_clinico ||
              j.objetivoTerapeutico
          )
          .filter((obj): obj is string => Boolean(obj));

        if (semFiltros) {
          setObjetivosCatalogo(Array.from(new Set(extraidos)));
        } else {
          setObjetivosCatalogo((prev) =>
            prev.length === 0 && extraidos.length > 0
              ? Array.from(new Set(extraidos))
              : prev
          );
        }
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

    const pinInicial = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
    setSessaoLivre({
      jogo,
      codigoPareamento: pinInicial,
    });

    void sessaoService
      .iniciarSessao({
        jogo_id: jogo.id,
        paciente_id: null,
        modo_sessao: "modo_livre",
        codigo_pareamento: pinInicial,
      })
      .then((sessaoCriada) => {
        if (sessaoCriada) {
          setSessaoLivre((atual) =>
            atual && atual.jogo.id === jogo.id
              ? {
                  ...atual,
                  sessaoId: sessaoCriada.id,
                  codigoPareamento:
                    sessaoCriada.session_token || atual.codigoPareamento,
                }
              : atual,
          );
        }
      })
      .catch(() => {
        // Mantém pareamento local em Modo Livre
      });
  }

  async function handleCopiarPinLivre() {
    if (!sessaoLivre?.codigoPareamento) return;
    try {
      await navigator.clipboard.writeText(sessaoLivre.codigoPareamento);
      setCopiadoLivre(true);
      toast.success("Código de Modo Livre copiado!");
      setTimeout(() => setCopiadoLivre(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 w-full mx-auto">
      {/* PAINEL DE SESSÃO EM MODO LIVRE (SEM PRONTUÁRIO) */}
      {sessaoLivre && (
        <div
          data-testid="painel-modo-livre-ativo"
          className="rounded-2xl border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
              <Cast className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Modo Livre Ativo: {sessaoLivre.jogo.titulo}
                </h2>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 text-[11px] font-semibold"
                >
                  Sem vínculo de prontuário
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilize o código de pareamento ao lado no tablet para explorar o jogo sem registrar métricas clínicas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span
              data-testid="pin-modo-livre"
              className="font-mono text-base font-extrabold tracking-widest text-primary bg-card px-3.5 py-2 rounded-xl border border-border"
            >
              {sessaoLivre.codigoPareamento}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCopiarPinLivre()}
              className="min-h-11 px-3 rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
              title="Copiar código de Modo Livre"
            >
              {copiadoLivre ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>Copiar PIN</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="btn-fechar-modo-livre"
              onClick={() => setSessaoLivre(null)}
              className="min-h-11 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              title="Encerrar Modo Livre"
            >
              <X className="h-4 w-4 mr-1" />
              <span>Fechar</span>
            </Button>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS E BUSCA */}
      <JogosFiltros
        filtros={filtros}
        onFiltroBusca={(busca) => setFiltros((prev) => ({ ...prev, busca }))}
        onFiltroObjetivo={(objetivo) =>
          setFiltros((prev) => ({ ...prev, objetivo }))
        }
        objetivosDisponiveis={objetivosCatalogo}
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-16 px-4 text-center text-sm text-muted-foreground">
          <p>Nenhum jogo encontrado para os filtros selecionados.</p>
          {((filtros.busca ?? "").trim() || (filtros.objetivo && filtros.objetivo !== "todos")) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-limpar-filtros-jogos"
              onClick={() => setFiltros({ busca: "", objetivo: "todos" })}
              className="min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Limpar filtros
            </Button>
          )}
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
  );
}

export default BibliotecaJogosPage;
