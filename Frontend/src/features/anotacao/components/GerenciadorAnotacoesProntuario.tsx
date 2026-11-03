import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import type {
  AnotacaoClinica,
  CriarAnotacaoDTO,
  FiltroAnotacaoDTO,
} from "../types/anotacao.types";
import { anotacaoService } from "../services/anotacao.service";
import { CardAnotacaoClinica } from "./CardAnotacaoClinica";
import { FiltrosAnotacoesClinicas } from "./FiltrosAnotacoesClinicas";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { Button } from "@/shared/components/ui/button";
import {
  PlusCircle,
  AlertCircle,
  RotateCcw,
  Send,
  Loader2,
  FolderOpen,
} from "lucide-react";

export interface GerenciadorAnotacoesProntuarioProps {
  pacienteId: string;
  usuarioLogadoId?: string;
  sessaoId?: string;
  somenteLeitura?: boolean;
  className?: string;
}

/**
 * ============================================================================
 * COMPONENTE: GerenciadorAnotacoesProntuario
 * Conformidade: RF16 (Prontuário e Anotações), RF19 (Filtros Longitudinais),
 *              RF21 (Autoria Indelével), RN04 (Vínculo e Clínica),
 *              RN05 (Inalterabilidade / Soft Delete), RNF07 (Acessibilidade)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */
/**
 * Longitudinal clinical notes manager for patient medical records with chronological timeline (RF16).
 * Medical Record Management (RF16, RF19, RN04, RN05): Provides search, author filtering, and soft-delete/reactivation.
 *
 * @param props - Component properties with patient UUID and authorization context
 * @returns Medical record notes management dashboard component
 */
export function GerenciadorAnotacoesProntuario({
  pacienteId,
  usuarioLogadoId,
  sessaoId,
  somenteLeitura = false,
  className = "",
}: GerenciadorAnotacoesProntuarioProps) {
  const authUser = useAuthStore((s) => s.user);

  // Identificação do terapeuta logado com fallback seguro
  const idTerapeutaFinal = useMemo(() => {
    if (usuarioLogadoId) return usuarioLogadoId;
    if (authUser?.id) return authUser.id;
    if (typeof window !== "undefined") {
      try {
        const stored =
          window.localStorage?.getItem("usuario_id") ||
          window.sessionStorage?.getItem("usuario_id");
        if (stored) return stored;
      } catch {
        // Ignora erros de acesso a storage em ambientes restritos/testes
      }
    }
    // Fallback padrão homologado (Dr. Marcos Terapeuta)
    return "a9849163-613f-4492-90cf-89985902d16e";
  }, [usuarioLogadoId, authUser?.id]);

  const [anotacoes, setAnotacoes] = useState<AnotacaoClinica[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltroAnotacaoDTO>({
    paciente_id: pacienteId,
    incluirInativos: false,
  });

  const [novoTexto, setNovoTexto] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const limiteCaracteres = 2000;

  // Carrega listagem de anotações do paciente
  const carregarAnotacoes = useCallback(async () => {
    if (!pacienteId) {
      setAnotacoes([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const dados = await anotacaoService.listarPorPaciente(pacienteId, {
        ...filtros,
        paciente_id: pacienteId,
      });
      setAnotacoes(dados);
    } catch (err) {
      const mensagem =
        err instanceof Error
          ? err.message
          : "Erro ao carregar anotações clínicas do paciente.";
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }, [pacienteId, filtros]);

  useEffect(() => {
    void carregarAnotacoes();
  }, [carregarAnotacoes]);

  // Lista dinâmica de autores disponíveis para filtro
  const autoresDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    anotacoes.forEach((a) => {
      if (a.terapeuta_id) {
        const nome =
          a.autor?.nome || a.terapeuta_nome || `Terapeuta (${a.terapeuta_id.slice(0, 8)})`;
        mapa.set(a.terapeuta_id, nome);
      }
    });
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [anotacoes]);

  // Filtragem defensiva no client-side para assegurar precisão em modo mock/offline
  const anotacoesFiltradas = useMemo(() => {
    return anotacoes.filter((a) => {
      // Filtro de inativos (RN05)
      const isDeletada = a.soft_delete === true || a.status_ativo === false;
      if (!filtros.incluirInativos && isDeletada) return false;

      // Filtro por termo de busca (RF19)
      if (filtros.busca && filtros.busca.trim()) {
        const termo = filtros.busca.toLowerCase().trim();
        const noConteudo = a.conteudo.toLowerCase().includes(termo);
        const noAutor = (a.autor?.nome || a.terapeuta_nome || "")
          .toLowerCase()
          .includes(termo);
        if (!noConteudo && !noAutor) return false;
      }

      // Filtro por origem (Gerais vs Sessão)
      if (filtros.somenteSemSessao === true && a.sessao_id) {
        return false;
      }
      if (filtros.somenteSemSessao === false && !a.sessao_id) {
        return false;
      }

      // Filtro por autor
      if (filtros.terapeutaId && a.terapeuta_id !== filtros.terapeutaId) {
        return false;
      }

      // Filtro por intervalo de datas (RF19)
      if (filtros.dataInicio && a.created_at) {
        const tInicio = new Date(filtros.dataInicio).getTime();
        if (new Date(a.created_at).getTime() < tInicio) return false;
      }
      if (filtros.dataFim && a.created_at) {
        const tFim = new Date(filtros.dataFim).getTime() + 86400000; // Final do dia selecionado
        if (new Date(a.created_at).getTime() > tFim) return false;
      }

      return true;
    });
  }, [anotacoes, filtros]);

  // Submissão de nova anotação clínica (RF16, RF21)
  async function handleCriarAnotacao(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting || somenteLeitura || !novoTexto.trim() || !pacienteId) return;

    setIsSubmitting(true);
    setErro(null);

    const dto: CriarAnotacaoDTO = {
      paciente_id: pacienteId,
      sessao_id: sessaoId || null,
      conteudo: novoTexto.trim(),
      terapeuta_id: usuarioLogadoId || authUser?.id || undefined,
    };

    try {
      const novaAnotacao = await anotacaoService.criar(dto);
      setNovoTexto("");
      // Atualização imediata otimista / reativa
      setAnotacoes((prev) => [novaAnotacao, ...prev]);
    } catch (err) {
      const mensagem =
        err instanceof Error
          ? err.message
          : "Erro ao salvar anotação clínica. Tente novamente.";
      setErro(mensagem);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Atualização inline (PATCH)
  async function handleAtualizarAnotacao(id: string, novoConteudo: string) {
    setIsSubmitting(true);
    try {
      const atualizada = await anotacaoService.atualizar(id, {
        conteudo: novoConteudo,
      });
      if (atualizada) {
        setAnotacoes((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...atualizada } : item)),
        );
      }
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao atualizar anotação clínica.";
      setErro(mensagem);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Inativação lógica (soft delete — RN05)
  async function handleInativarAnotacao(id: string) {
    setIsSubmitting(true);
    try {
      const inativada = await anotacaoService.inativar(id);
      if (inativada) {
        setAnotacoes((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, soft_delete: true, status_ativo: false }
              : item,
          ),
        );
      } else {
        // Fallback caso retorno direto não venha montado
        setAnotacoes((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, soft_delete: true, status_ativo: false }
              : item,
          ),
        );
      }
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao inativar anotação clínica.";
      setErro(mensagem);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      data-testid="gerenciador-anotacoes-prontuario"
      className={`flex flex-col gap-5 ${className}`}
    >
      {/* Formulário de Nova Anotação Clínica (RF16, RF21) */}
      {!somenteLeitura && (
        <form
          onSubmit={handleCriarAnotacao}
          data-testid="form-nova-anotacao"
          className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Nova Anotação Clínica</span>
            </div>
            {sessaoId ? (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                Vinculada à sessão atual
              </span>
            ) : (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                Prontuário geral
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nova-anotacao-textarea" className="sr-only">
              Conteúdo da anotação clínica
            </label>
            <textarea
              id="nova-anotacao-textarea"
              data-testid="textarea-nova-anotacao"
              placeholder="Descreva a evolução comportamental, respostas a estímulos, foco atencional ou observações clínicas do paciente..."
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              maxLength={limiteCaracteres}
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-input bg-background p-3.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{limiteCaracteres} caracteres restantes</span>
              <span data-testid="contador-caracteres">
                {novoTexto.length}/{limiteCaracteres}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || !novoTexto.trim()}
              className="min-h-11 min-w-11 px-5 font-semibold cursor-pointer"
              data-testid="botao-salvar-nova-anotacao"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando no Prontuário...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Salvar Anotação
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Barra de Filtros Longitudinais (RF19) */}
      <FiltrosAnotacoesClinicas
        filtros={filtros}
        onFiltrosChange={setFiltros}
        autoresDisponiveis={autoresDisponiveis}
        desabilitado={carregando}
      />

      {/* ======================================================================
          ESTADOS VISUAIS DA LISTAGEM
          1. Skeleton Loader (Carregando sem CLS)
          2. Error State (Falha com botão Retry)
          3. Empty State (Nenhum registro)
          4. Success State (Lista de CardAnotacaoClinica)
         ====================================================================== */}

      {/* 1. SKELETON LOADER */}
      {carregando && anotacoes.length === 0 && (
        <div
          data-testid="anotacoes-skeleton"
          className="flex flex-col gap-3.5"
          aria-label="Carregando anotações clínicas"
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-border bg-card p-5 animate-pulse flex flex-col gap-3 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-muted" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-36 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
                <div className="h-6 w-24 rounded-full bg-muted" />
              </div>
              <div className="flex flex-col gap-2 py-2">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. ERROR STATE COM RETRY */}
      {erro && !carregando && (
        <div
          data-testid="anotacoes-error"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center flex flex-col items-center gap-3 shadow-xs"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-sm text-destructive">
              Falha ao Carregar Anotações
            </h4>
            <p className="text-xs text-muted-foreground max-w-md">{erro}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void carregarAnotacoes()}
            className="min-h-11 min-w-11 px-4 cursor-pointer mt-1"
            data-testid="botao-retry-anotacoes"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!carregando && !erro && anotacoesFiltradas.length === 0 && (
        <div
          data-testid="anotacoes-empty"
          className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center flex flex-col items-center gap-3 shadow-xs"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-sm text-foreground">
              Nenhuma anotação encontrada
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Não há anotações registradas para este paciente ou correspondentes aos filtros aplicados.
            </p>
          </div>
        </div>
      )}

      {/* 4. SUCCESS STATE (Lista de Anotações) */}
      {!carregando && !erro && anotacoesFiltradas.length > 0 && (
        <div
          data-testid="anotacoes-lista"
          className="flex flex-col gap-3.5"
        >
          {anotacoesFiltradas.map((anotacao) => (
            <CardAnotacaoClinica
              key={anotacao.id}
              anotacao={anotacao}
              usuarioLogadoId={idTerapeutaFinal}
              onAtualizar={handleAtualizarAnotacao}
              onInativar={handleInativarAnotacao}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default GerenciadorAnotacoesProntuario;
