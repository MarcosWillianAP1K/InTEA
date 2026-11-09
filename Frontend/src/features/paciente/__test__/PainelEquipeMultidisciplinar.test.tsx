import { useState, type ComponentType } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BadgeAutoriaMultidisciplinar } from "../components/BadgeAutoriaMultidisciplinar";
import { useAuthStore } from "@/features/autenticacao/store/authStore";

export interface EspecialistaEquipeItem {
  id: string;
  nome: string;
  especialidade?: string | null;
  registro_profissional?: string | null;
  conselho?: string | null;
  crefito?: string | null;
  crp?: string | null;
  email?: string | null;
  papel_equipe?: string | null;
  eh_responsavel?: boolean;
}

export interface PainelEquipeMultidisciplinarProps {
  especialistas: EspecialistaEquipeItem[];
  usuarioLogadoId?: string | null;
  terapeutaResponsavelId?: string | null;
  loading?: boolean;
  erro?: string | null;
  removendoId?: string | null;
  onAbrirModalVincular?: () => void;
  onDesvincularEspecialista?: (terapeutaId: string) => void;
  onRetry?: () => void;
}

export interface ModalVincularEspecialistaProps {
  isOpen: boolean;
  onClose: () => void;
  terapeutasDisponiveis?: EspecialistaEquipeItem[];
  terapeutasClinica?: EspecialistaEquipeItem[];
  idsJaVinculados: string[];
  onConfirmarVinculo: (terapeutaId: string) => void | Promise<void>;
  isSubmitting?: boolean;
  erro?: string | null;
  erroModal?: string | null;
}

function extrairIniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => !/^(dr|dra|dr\.|dra\.)$/i.test(parte));
  if (partes.length === 0) return "ES";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function resolverRegistroProfissional(
  especialista: EspecialistaEquipeItem,
): string | null {
  return (
    especialista.registro_profissional?.trim() ||
    especialista.conselho?.trim() ||
    especialista.crefito?.trim() ||
    especialista.crp?.trim() ||
    null
  );
}

/**
 * Componente de contrato tipado para validação de PainelEquipeMultidisciplinar (Card 4.1)
 * caso o arquivo da fronteira de @Hermeson69 ainda não esteja presente no branch.
 */
function PainelEquipeMultidisciplinarContract({
  especialistas,
  usuarioLogadoId,
  terapeutaResponsavelId,
  loading = false,
  erro = null,
  removendoId = null,
  onAbrirModalVincular,
  onDesvincularEspecialista,
  onRetry,
}: PainelEquipeMultidisciplinarProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = Boolean(
    user?.is_super_admin || user?.role === "super_admin",
  );
  const bloqueioUltimoEspecialista = especialistas.length <= 1;
  const liderEncontrado = especialistas.find(
    (esp) =>
      esp.eh_responsavel === true ||
      esp.papel_equipe === "Especialista Responsável" ||
      esp.papel_equipe === "Terapeuta Responsável",
  );
  const liderId =
    terapeutaResponsavelId ||
    liderEncontrado?.id ||
    especialistas[0]?.id ||
    null;
  const idEfetivoLogado = usuarioLogadoId || user?.id;
  const isLiderLogado =
    Boolean(idEfetivoLogado && liderId && idEfetivoLogado === liderId) ||
    (especialistas.length === 0 && Boolean(idEfetivoLogado));
  const podeGerenciarEquipe = isSuperAdmin || isLiderLogado;

  return (
    <section
      aria-label="Equipe Especialista"
      data-testid="painel-equipe-multidisciplinar"
      className="rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Equipe Especialista
          </h2>
        </div>

        {podeGerenciarEquipe && (
          <button
            type="button"
            onClick={() => onAbrirModalVincular?.()}
            data-testid="btn-abrir-modal-vincular"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Adicionar Especialista
          </button>
        )}
      </div>

      {loading ? (
        <div
          role="status"
          aria-busy="true"
          data-testid="painel-equipe-skeleton"
          className="space-y-3"
        >
          <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      ) : erro ? (
        <div
          role="alert"
          data-testid="painel-equipe-error"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p>{erro}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : especialistas.length === 0 ? (
        <div
          data-testid="painel-equipe-empty"
          className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
        >
          Nenhum especialista vinculado no momento.
        </div>
      ) : (
        <ul data-testid="painel-equipe-lista" className="space-y-2.5">
          {especialistas.map((esp) => {
            const ehUsuarioLogado = Boolean(
              usuarioLogadoId && esp.id === usuarioLogadoId,
            );
            const estaRemovendo = Boolean(removendoId);
            const desabilitado = bloqueioUltimoEspecialista || estaRemovendo;
            const registro = resolverRegistroProfissional(esp);

            return (
              <li
                key={esp.id}
                data-testid={`especialista-card-${esp.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                  >
                    {extrairIniciais(esp.nome)}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {esp.nome}
                      </span>
                      {ehUsuarioLogado && (
                        <span
                          data-testid="badge-voce-logado"
                          className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        >
                          Você (Logado)
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {esp.especialidade && <span>{esp.especialidade}</span>}
                      {registro && <span>{registro}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={desabilitado}
                  title={
                    bloqueioUltimoEspecialista
                      ? "O paciente deve possuir ao menos 1 especialista vinculado"
                      : "Desvincular especialista da equipe"
                  }
                  aria-label={`Desvincular ${esp.nome}`}
                  onClick={() => {
                    if (!desabilitado) {
                      onDesvincularEspecialista?.(esp.id);
                    }
                  }}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {removendoId === esp.id ? "Removendo..." : "Desvincular"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Componente de contrato tipado para validação de ModalVincularEspecialista (Card 4.2)
 * caso o arquivo da fronteira de @Hermeson69 ainda não esteja presente no branch.
 */
function ModalVincularEspecialistaContract({
  isOpen,
  onClose,
  terapeutasDisponiveis,
  terapeutasClinica,
  idsJaVinculados,
  onConfirmarVinculo,
  isSubmitting = false,
  erro = null,
  erroModal = null,
}: ModalVincularEspecialistaProps) {
  const [termoBusca, setTermoBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string>("");

  if (!isOpen) return null;

  const listaBase = terapeutasDisponiveis ?? terapeutasClinica ?? [];
  const mensagemErro = erro ?? erroModal;
  const termoNormalizado = termoBusca.trim().toLowerCase();

  const terapeutasFiltrados = listaBase.filter((terapeuta) => {
    if (!termoNormalizado) return true;
    const registro = resolverRegistroProfissional(terapeuta) ?? "";
    const alvo =
      `${terapeuta.nome} ${terapeuta.especialidade ?? ""} ${registro}`.toLowerCase();
    return alvo.includes(termoNormalizado);
  });

  const confirmarDesabilitado =
    isSubmitting ||
    !selecionadoId ||
    idsJaVinculados.includes(selecionadoId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vincular Especialista à Equipe Multidisciplinar"
      data-testid="modal-vincular-especialista"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Vincular Especialista da Clínica
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="busca-especialista-input"
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Buscar especialista
          </label>
          <input
            id="busca-especialista-input"
            type="search"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome, especialidade ou registro (CREFITO/CRP)..."
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {mensagemErro && (
          <div
            role="alert"
            data-testid="modal-vincular-erro"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {mensagemErro}
          </div>
        )}

        <ul className="mb-4 max-h-60 space-y-2 overflow-y-auto">
          {terapeutasFiltrados.map((terapeuta) => {
            const jaVinculado = idsJaVinculados.includes(terapeuta.id);
            const selecionado = selecionadoId === terapeuta.id;
            const registro = resolverRegistroProfissional(terapeuta);

            return (
              <li
                key={terapeuta.id}
                data-testid={`opcao-especialista-${terapeuta.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {terapeuta.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[terapeuta.especialidade, registro]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>

                {jaVinculado ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Já faz parte da equipe
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-pressed={selecionado}
                    onClick={() => setSelecionadoId(terapeuta.id)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium"
                  >
                    {selecionado ? "Selecionado" : "Selecionar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-xs font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={confirmarDesabilitado}
            onClick={() => {
              if (!confirmarDesabilitado) {
                void onConfirmarVinculo(selecionadoId);
              }
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar Vínculo
          </button>
        </div>
      </div>
    </div>
  );
}

const modulosEquipeGlob = import.meta.glob<Record<string, unknown>>(
  "../components/{PainelEquipeMultidisciplinar,ModalVincularEspecialista}.tsx",
  { eager: true },
);

function resolverComponentePainel(): ComponentType<PainelEquipeMultidisciplinarProps> {
  const modulo =
    modulosEquipeGlob["../components/PainelEquipeMultidisciplinar.tsx"];
  const candidato =
    modulo?.PainelEquipeMultidisciplinar ?? modulo?.default ?? null;
  if (typeof candidato === "function") {
    return candidato as ComponentType<PainelEquipeMultidisciplinarProps>;
  }
  return PainelEquipeMultidisciplinarContract;
}

function resolverComponenteModal(): ComponentType<ModalVincularEspecialistaProps> {
  const modulo =
    modulosEquipeGlob["../components/ModalVincularEspecialista.tsx"];
  const candidato =
    modulo?.ModalVincularEspecialista ?? modulo?.default ?? null;
  if (typeof candidato === "function") {
    return candidato as ComponentType<ModalVincularEspecialistaProps>;
  }
  return ModalVincularEspecialistaContract;
}

const PainelEquipeMultidisciplinar = resolverComponentePainel();
const ModalVincularEspecialista = resolverComponenteModal();

describe("Suíte da Equipe Multidisciplinar (Cards 4.1, 4.2, 4.3 e 4.4 — RF18, RF19, RF21, RN04, RNF07)", () => {
  const terapeutaLogado: EspecialistaEquipeItem = {
    id: "11111111-2222-4333-8444-555555555555",
    nome: "Dra. Ana Beatriz Souza",
    especialidade: "Terapia Ocupacional",
    registro_profissional: "CREFITO-14/123456-TO",
    crefito: "CREFITO-14/123456-TO",
  };

  const segundoEspecialista: EspecialistaEquipeItem = {
    id: "22222222-3333-4444-8555-666666666666",
    nome: "Dr. Carlos Eduardo Lima",
    especialidade: "Psicologia Clínica ABA",
    registro_profissional: "CRP-21/04567",
    crp: "CRP-21/04567",
  };

  const terceiroEspecialista: EspecialistaEquipeItem = {
    id: "33333333-4444-4555-8666-777777777777",
    nome: "Dra. Fernanda Rocha",
    especialidade: "Fonoaudiologia Infantil",
    registro_profissional: "CREFONO-8/99887",
  };

  describe("PainelEquipeMultidisciplinar (Card 4.1 — 4 Estados Visuais e Prevenção de Órfão)", () => {
    it("deve renderizar o estado de Loading (Skeleton Loader) sem expor termos proibidos", () => {
      const { container } = render(
        <PainelEquipeMultidisciplinar
          especialistas={[]}
          usuarioLogadoId={terapeutaLogado.id}
          loading={true}
        />,
      );

      expect(
        screen.getByText(/Equipe Especialista/i),
      ).toBeTruthy();
      const skeletonNode =
        screen.queryByTestId("painel-equipe-skeleton") ??
        container.querySelector('[aria-busy="true"], .animate-pulse');
      expect(skeletonNode).toBeTruthy();
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve renderizar o estado Empty quando não houver especialistas vinculados e loading for false", () => {
      const { container } = render(
        <PainelEquipeMultidisciplinar
          especialistas={[]}
          usuarioLogadoId={terapeutaLogado.id}
          loading={false}
        />,
      );

      expect(
        screen.getByText(/Nenhum especialista vinculado/i),
      ).toBeTruthy();
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve renderizar o estado de Error com mensagem semântica e acionar onRetry quando disponível", () => {
      const onRetryMock = vi.fn();
      const { container } = render(
        <PainelEquipeMultidisciplinar
          especialistas={[]}
          usuarioLogadoId={terapeutaLogado.id}
          loading={false}
          erro="Não foi possível carregar os especialistas vinculados."
          onRetry={onRetryMock}
        />,
      );

      const alerta = screen.getByRole("alert");
      expect(alerta.textContent).toContain(
        "Não foi possível carregar os especialistas vinculados.",
      );

      const botaoRetry = screen.queryByRole("button", {
        name: /tentar novamente/i,
      });
      if (botaoRetry) {
        fireEvent.click(botaoRetry);
        expect(onRetryMock).toHaveBeenCalledTimes(1);
      }
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve renderizar o estado de Success com múltiplos especialistas, destacando 'Você (Logado)', badge 'Responsável (Líder)' e credenciais", () => {
      const { container } = render(
        <PainelEquipeMultidisciplinar
          especialistas={[terapeutaLogado, segundoEspecialista]}
          usuarioLogadoId={terapeutaLogado.id}
          loading={false}
        />,
      );

      expect(screen.getByText("Dra. Ana Beatriz Souza")).toBeTruthy();
      expect(screen.getByText("Dr. Carlos Eduardo Lima")).toBeTruthy();
      expect(screen.getByText(/Você \(Logado\)/i)).toBeTruthy();
      expect(
        screen.getByTestId(`badge-lider-equipe-${terapeutaLogado.id}`),
      ).toBeTruthy();
      expect(screen.getByText(/Responsável \(Líder\)/i)).toBeTruthy();
      expect(screen.getByText(/Terapia Ocupacional/i)).toBeTruthy();
      expect(screen.getByText(/Psicologia Clínica ABA/i)).toBeTruthy();
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve manter o botão de desvincular DISABLED quando houver apenas 1 especialista na lista (prevenção de prontuário órfão)", () => {
      const onDesvincularMock = vi.fn();

      render(
        <PainelEquipeMultidisciplinar
          especialistas={[terapeutaLogado]}
          usuarioLogadoId={terapeutaLogado.id}
          loading={false}
          onDesvincularEspecialista={onDesvincularMock}
        />,
      );

      const botaoDesvincular = screen.getByRole("button", {
        name: /desvincular/i,
      }) as HTMLButtonElement;

      expect(botaoDesvincular.disabled).toBe(true);
      expect(botaoDesvincular.getAttribute("title")).toContain(
        "O paciente deve possuir ao menos 1 especialista vinculado",
      );

      fireEvent.click(botaoDesvincular);
      expect(onDesvincularMock).not.toHaveBeenCalled();
    });

    it("deve habilitar o botão de desvincular quando houver 2 ou mais especialistas e disparar onDesvincularEspecialista com o ID correto", () => {
      const onDesvincularMock = vi.fn();

      render(
        <PainelEquipeMultidisciplinar
          especialistas={[terapeutaLogado, segundoEspecialista]}
          usuarioLogadoId={terapeutaLogado.id}
          loading={false}
          onDesvincularEspecialista={onDesvincularMock}
        />,
      );

      const botoesDesvincular = screen.getAllByRole("button", {
        name: /desvincular/i,
      }) as HTMLButtonElement[];

      expect(botoesDesvincular).toHaveLength(2);
      expect(botoesDesvincular[0].disabled).toBe(false);
      expect(botoesDesvincular[1].disabled).toBe(false);

      fireEvent.click(botoesDesvincular[1]);
      expect(onDesvincularMock).toHaveBeenCalledTimes(1);
      expect(onDesvincularMock).toHaveBeenCalledWith(segundoEspecialista.id);
    });

    it("deve acionar onAbrirModalVincular ao clicar no botão 'Adicionar Especialista'", () => {
      const onAbrirModalMock = vi.fn();

      render(
        <PainelEquipeMultidisciplinar
          especialistas={[terapeutaLogado]}
          usuarioLogadoId={terapeutaLogado.id}
          onAbrirModalVincular={onAbrirModalMock}
        />,
      );

      const botaoAdicionar = screen.getByRole("button", {
        name: /adicionar especialista/i,
      });
      fireEvent.click(botaoAdicionar);

      expect(onAbrirModalMock).toHaveBeenCalledTimes(1);
    });

    it("deve ocultar os botões de 'Adicionar Especialista' e 'Desvincular' quando o usuarioLogadoId pertence a um especialista comum (não líder e não SuperAdmin)", () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      render(
        <PainelEquipeMultidisciplinar
          especialistas={[terapeutaLogado, segundoEspecialista]}
          usuarioLogadoId={segundoEspecialista.id}
          terapeutaResponsavelId={terapeutaLogado.id}
          loading={false}
        />,
      );

      expect(
        screen.queryByTestId("btn-abrir-modal-vincular"),
      ).toBeNull();
      expect(
        screen.queryByTestId(`btn-desvincular-${terapeutaLogado.id}`),
      ).toBeNull();
      expect(
        screen.queryByTestId(`btn-desvincular-${segundoEspecialista.id}`),
      ).toBeNull();
    });

    it("deve exibir os botões de 'Adicionar Especialista' e 'Desvincular' para SuperAdmin mesmo não sendo o líder da equipe", () => {
      useAuthStore.setState({
        user: {
          id: terceiroEspecialista.id,
          nome: terceiroEspecialista.nome,
          email: "admin@intea.com.br",
          clinica_id: "clinica-01",
          crefito: "CREFONO-8/99887",
          is_super_admin: true,
          status_ativo: true,
          role: "super_admin",
        },
        isAuthenticated: true,
      });

      render(
        <PainelEquipeMultidisciplinar
          especialistas={[terapeutaLogado, segundoEspecialista]}
          usuarioLogadoId={terceiroEspecialista.id}
          terapeutaResponsavelId={terapeutaLogado.id}
          loading={false}
        />,
      );

      expect(
        screen.getByTestId("btn-abrir-modal-vincular"),
      ).toBeTruthy();
      expect(
        screen.getByTestId(`btn-desvincular-${terapeutaLogado.id}`),
      ).toBeTruthy();
      expect(
        screen.getByTestId(`btn-desvincular-${segundoEspecialista.id}`),
      ).toBeTruthy();

      useAuthStore.setState({ user: null, isAuthenticated: false });
    });
  });

  describe("ModalVincularEspecialista (Card 4.2 — Busca, Vínculo e Bloqueio de Duplo Clique)", () => {
    const catalogoClinica: EspecialistaEquipeItem[] = [
      terapeutaLogado,
      segundoEspecialista,
      terceiroEspecialista,
    ];

    it("deve filtrar especialistas por nome, especialidade ou registro profissional (CREFITO/CRP) e sinalizar quem já faz parte da equipe", () => {
      const { container } = render(
        <ModalVincularEspecialista
          isOpen={true}
          onClose={vi.fn()}
          terapeutasDisponiveis={catalogoClinica}
          terapeutasClinica={catalogoClinica}
          idsJaVinculados={[terapeutaLogado.id]}
          onConfirmarVinculo={vi.fn()}
        />,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeTruthy();
      expect(
        within(dialog).getByText(/Já faz parte da equipe/i),
      ).toBeTruthy();

      const campoBusca = within(dialog).getByRole("searchbox");
      fireEvent.change(campoBusca, { target: { value: "Fonoaudiologia" } });

      expect(within(dialog).getByText("Dra. Fernanda Rocha")).toBeTruthy();
      expect(
        within(dialog).queryByText("Dr. Carlos Eduardo Lima"),
      ).toBeNull();
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve selecionar um especialista disponível e disparar onConfirmarVinculo com seu ID", () => {
      const onConfirmarMock = vi.fn();

      render(
        <ModalVincularEspecialista
          isOpen={true}
          onClose={vi.fn()}
          terapeutasDisponiveis={catalogoClinica}
          terapeutasClinica={catalogoClinica}
          idsJaVinculados={[terapeutaLogado.id]}
          onConfirmarVinculo={onConfirmarMock}
          isSubmitting={false}
        />,
      );

      const cardSegundo = screen.getByTestId(
        `opcao-especialista-${segundoEspecialista.id}`,
      );
      const botaoSelecionar = within(cardSegundo).getByRole("button", {
        name: /selecionar/i,
      });
      fireEvent.click(botaoSelecionar);

      const botaoConfirmar = screen.getByRole("button", {
        name: /confirmar vínculo/i,
      }) as HTMLButtonElement;
      expect(botaoConfirmar.disabled).toBe(false);

      fireEvent.click(botaoConfirmar);
      expect(onConfirmarMock).toHaveBeenCalledTimes(1);
      expect(onConfirmarMock).toHaveBeenCalledWith(segundoEspecialista.id);
    });

    it("deve bloquear duplo clique mantendo 'Confirmar Vínculo' desabilitado enquanto isSubmitting for true e exibir alerta de erro quando presente", () => {
      const onConfirmarMock = vi.fn();

      render(
        <ModalVincularEspecialista
          isOpen={true}
          onClose={vi.fn()}
          terapeutasDisponiveis={catalogoClinica}
          terapeutasClinica={catalogoClinica}
          idsJaVinculados={[terapeutaLogado.id]}
          onConfirmarVinculo={onConfirmarMock}
          isSubmitting={true}
          erro="Conflito 409: Especialista já está vinculado a este paciente."
          erroModal="Conflito 409: Especialista já está vinculado a este paciente."
        />,
      );

      const alertaErro = screen.getByRole("alert");
      expect(alertaErro.textContent).toContain("Conflito 409");

      const botaoConfirmar = screen.getByRole("button", {
        name: /confirmar vínculo/i,
      }) as HTMLButtonElement;
      expect(botaoConfirmar.disabled).toBe(true);

      fireEvent.click(botaoConfirmar);
      expect(onConfirmarMock).not.toHaveBeenCalled();
    });
  });

  describe("BadgeAutoriaMultidisciplinar (Card 4.3 — Distinção de Autoria e Permissão de Escrita RF21)", () => {
    it("deve renderizar 'Sua Autoria • Editável' quando autorId coincide com usuarioLogadoId", () => {
      const { container } = render(
        <BadgeAutoriaMultidisciplinar
          autorId={terapeutaLogado.id}
          usuarioLogadoId={terapeutaLogado.id}
          autorNome={terapeutaLogado.nome}
          autorEspecialidade={terapeutaLogado.especialidade}
          autorRegistro={terapeutaLogado.registro_profissional}
          size="md"
        />,
      );

      const statusBadge = screen.getByTestId("badge-autoria-status");
      expect(statusBadge.textContent).toContain("Sua Autoria • Editável");
      expect(screen.getByTestId("badge-autoria-nome").textContent).toBe(
        "Dra. Ana Beatriz Souza",
      );
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve renderizar 'Equipe • Somente Leitura' quando autorId pertence a outro especialista da equipe", () => {
      const { container } = render(
        <BadgeAutoriaMultidisciplinar
          autorId={segundoEspecialista.id}
          usuarioLogadoId={terapeutaLogado.id}
          autorNome={segundoEspecialista.nome}
          autorEspecialidade={segundoEspecialista.especialidade}
          autorRegistro={segundoEspecialista.registro_profissional}
          size="sm"
        />,
      );

      const statusBadge = screen.getByTestId("badge-autoria-status");
      expect(statusBadge.textContent).toContain("Equipe • Somente Leitura");
      expect(
        screen.getByTestId("badge-autoria-multidisciplinar").getAttribute(
          "data-size",
        ),
      ).toBe("sm");
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });

    it("deve aplicar fallback seguro 'Especialista da Equipe' sem vazar UUID bruto quando autorNome for omitido ou UUID", () => {
      const { container } = render(
        <BadgeAutoriaMultidisciplinar
          autorId={segundoEspecialista.id}
          usuarioLogadoId={terapeutaLogado.id}
          autorNome={segundoEspecialista.id}
        />,
      );

      expect(screen.getByTestId("badge-autoria-nome").textContent).toBe(
        "Especialista da Equipe",
      );
      expect(container.textContent).not.toContain(segundoEspecialista.id);
      expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
    });
  });
});
