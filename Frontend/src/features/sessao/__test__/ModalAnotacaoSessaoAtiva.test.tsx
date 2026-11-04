import { describe, it, expect, beforeEach, vi, type MockInstance } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ModalAnotacaoSessaoAtiva } from "../components/ModalAnotacaoSessaoAtiva";
import { CardSessaoAtiva } from "../components/CardSessaoAtiva";
import { ControlesClinicos } from "../components/ControlesClinicos";
import { anotacaoService } from "@/features/anotacao/services/anotacao.service";
import type { AnotacaoClinica } from "@/features/anotacao/types/anotacao.types";
import { toast } from "sonner";

// Mock Sonner
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Feature: Modal de Anotação Clínica em Tempo Real no Cockpit de Sessão Ativa", () => {
  const sessaoIdPadrao = "sessao-uuid-123";
  const pacienteIdPadrao = "pac-uuid-456";
  const draftKey = `draft_anotacao_sessao_${sessaoIdPadrao}`;

  let spyListarPorSessao: MockInstance;
  let spyCriar: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();

    spyListarPorSessao = vi
      .spyOn(anotacaoService, "listarPorSessao")
      .mockResolvedValue([]);
    spyCriar = vi
      .spyOn(anotacaoService, "criar")
      .mockResolvedValue({
        id: "nova-anotacao-uuid",
        sessao_id: sessaoIdPadrao,
        paciente_id: pacienteIdPadrao,
        terapeuta_id: "terap-uuid-789",
        terapeuta_nome: "Dra. Terapeuta",
        conteudo: "Observação clínica registrada com sucesso.",
        status_ativo: true,
        soft_delete: false,
        created_at: new Date().toISOString(),
      } as AnotacaoClinica);
  });

  it("1. deve abrir o modal, exibir contexto do paciente e carregar histórico cronológico via anotacaoService.listarPorSessao", async () => {
    const mockHistorico: AnotacaoClinica[] = [
      {
        id: "anot-1",
        sessao_id: sessaoIdPadrao,
        paciente_id: pacienteIdPadrao,
        terapeuta_id: "terap-1",
        terapeuta_nome: "Dra. Sofia Lima",
        conteudo: "Paciente iniciou a atividade com contato visual estável.",
        status_ativo: true,
        soft_delete: false,
        created_at: "2026-10-27T10:00:00Z",
      },
      {
        id: "anot-2",
        sessao_id: sessaoIdPadrao,
        paciente_id: pacienteIdPadrao,
        terapeuta_id: "terap-1",
        terapeuta_nome: "Dra. Sofia Lima",
        conteudo: "Ajustada modulação DDA para nível 3 devido à boa retenção.",
        status_ativo: true,
        soft_delete: false,
        created_at: "2026-10-27T10:15:00Z",
      },
    ];

    spyListarPorSessao.mockResolvedValueOnce(mockHistorico);

    render(
      <ModalAnotacaoSessaoAtiva
        aberto={true}
        onFechar={vi.fn()}
        sessaoId={sessaoIdPadrao}
        pacienteId={pacienteIdPadrao}
        pacienteNome="Lucas Silva"
      />
    );

    // Modal deve estar visível
    expect(screen.getByTestId("modal-anotacao-sessao-ativa")).toBeDefined();
    expect(screen.getByTestId("badge-paciente-modal").textContent).toBe("Lucas Silva");

    // Deve ter chamado o serviço com o ID da sessão ativa
    expect(spyListarPorSessao).toHaveBeenCalledWith(sessaoIdPadrao);

    // Aguarda exibição das anotações
    await waitFor(() => {
      expect(screen.getByTestId("item-anotacao-anot-1")).toBeDefined();
      expect(screen.getByTestId("item-anotacao-anot-2")).toBeDefined();
    });

    expect(
      screen.getByText("Paciente iniciou a atividade com contato visual estável.")
    ).toBeDefined();
    expect(
      screen.getByText("Ajustada modulação DDA para nível 3 devido à boa retenção.")
    ).toBeDefined();
  });

  it("2. deve exibir estado informativo vazio quando a sessão não possuir anotações anteriores", async () => {
    spyListarPorSessao.mockResolvedValueOnce([]);

    render(
      <ModalAnotacaoSessaoAtiva
        aberto={true}
        onFechar={vi.fn()}
        sessaoId={sessaoIdPadrao}
        pacienteId={pacienteIdPadrao}
        pacienteNome="Lucas Silva"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("lista-anotacoes-vazia")).toBeDefined();
    });

    expect(
      screen.getByText("Nenhuma anotação registrada ainda nesta sessão.")
    ).toBeDefined();
  });

  it("3. deve permitir redigir anotação, proteger rascunho em sessionStorage e submeter com sucesso via anotacaoService.criar", async () => {
    const onSalva = vi.fn();
    render(
      <ModalAnotacaoSessaoAtiva
        aberto={true}
        onFechar={vi.fn()}
        sessaoId={sessaoIdPadrao}
        pacienteId={pacienteIdPadrao}
        pacienteNome="Lucas Silva"
        onAnotacaoSalva={onSalva}
      />
    );

    const textarea = screen.getByTestId("textarea-anotacao-sessao") as HTMLTextAreaElement;
    const textoObservacao = "Paciente interagiu espontaneamente ao estímulo sonoro.";

    // Digita no textarea
    fireEvent.change(textarea, { target: { value: textoObservacao } });
    expect(textarea.value).toBe(textoObservacao);

    // Rascunho salvo no sessionStorage
    expect(sessionStorage.getItem(draftKey)).toBe(textoObservacao);

    // Contador de caracteres atualizado
    const contador = screen.getByTestId("contador-caracteres-modal");
    expect(contador.textContent).toContain(`${textoObservacao.length} / 2000 caracteres`);

    // Botão de salvar deve estar habilitado
    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao-modal");
    expect(botaoSalvar.hasAttribute("disabled")).toBe(false);

    // Submete
    await act(async () => {
      fireEvent.click(botaoSalvar);
    });

    await waitFor(() => {
      expect(spyCriar).toHaveBeenCalledWith({
        paciente_id: pacienteIdPadrao,
        sessao_id: sessaoIdPadrao,
        conteudo: textoObservacao,
      });
    });

    // Rascunho limpo após submissão bem-sucedida
    expect(sessionStorage.getItem(draftKey)).toBeNull();
    expect(textarea.value).toBe("");

    // Feedback visual sutil (RNF05)
    expect(toast.success).toHaveBeenCalledWith(
      "Anotação clínica registrada com sucesso no prontuário."
    );
    expect(onSalva).toHaveBeenCalled();
  });

  it("4. deve restaurar automaticamente rascunho pré-existente do sessionStorage ao abrir o modal", async () => {
    const rascunhoPrevio = "Rascunho que sobreviveu ao F5 ou fechamento do modal.";
    sessionStorage.setItem(draftKey, rascunhoPrevio);

    await act(async () => {
      render(
        <ModalAnotacaoSessaoAtiva
          aberto={true}
          onFechar={vi.fn()}
          sessaoId={sessaoIdPadrao}
          pacienteId={pacienteIdPadrao}
        />
      );
    });

    const textarea = screen.getByTestId("textarea-anotacao-sessao") as HTMLTextAreaElement;
    expect(textarea.value).toBe(rascunhoPrevio);
  });

  it("5. deve validar tamanho mínimo de 3 caracteres e desabilitar botão de salvar", async () => {
    await act(async () => {
      render(
        <ModalAnotacaoSessaoAtiva
          aberto={true}
          onFechar={vi.fn()}
          sessaoId={sessaoIdPadrao}
          pacienteId={pacienteIdPadrao}
        />
      );
    });

    const textarea = screen.getByTestId("textarea-anotacao-sessao") as HTMLTextAreaElement;
    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao-modal");

    // Vazio: desabilitado
    expect(botaoSalvar.hasAttribute("disabled")).toBe(true);

    // Menos de 3 caracteres: exibe aviso e continua desabilitado
    act(() => {
      fireEvent.change(textarea, { target: { value: "Oi" } });
    });
    expect(screen.getByTestId("aviso-validacao-tamanho")).toBeDefined();
    expect(botaoSalvar.hasAttribute("disabled")).toBe(true);

    // Com 3 ou mais: habilita
    act(() => {
      fireEvent.change(textarea, { target: { value: "Olá" } });
    });
    expect(screen.queryByTestId("aviso-validacao-tamanho")).toBeNull();
    expect(botaoSalvar.hasAttribute("disabled")).toBe(false);
  });

  it("6. deve aplicar a invariante RN01 (Modo Livre): bloquear anotação e exibir alerta de conformidade", async () => {
    await act(async () => {
      render(
        <ModalAnotacaoSessaoAtiva
          aberto={true}
          onFechar={vi.fn()}
          sessaoId="sessao-livre-999"
          pacienteId={null}
          isModoLivre={true}
        />
      );
    });

    // Alerta de conformidade RN01 visível
    expect(screen.getByTestId("alerta-modo-livre-modal")).toBeDefined();
    expect(screen.getByTestId("badge-modo-livre-modal").textContent).toBe("Modo Livre");

    // Textarea desabilitado
    const textarea = screen.getByTestId("textarea-anotacao-sessao") as HTMLTextAreaElement;
    expect(textarea.hasAttribute("disabled")).toBe(true);

    // Botão de salvar desabilitado
    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao-modal");
    expect(botaoSalvar.hasAttribute("disabled")).toBe(true);

    // Não deve consultar histórico em modo livre
    expect(spyListarPorSessao).not.toHaveBeenCalled();
  });

  it("7. deve tratar erro 403 Forbidden com resiliência sem quebrar o monitoramento (RN04)", async () => {
    spyCriar.mockRejectedValueOnce(
      new Error("403 Forbidden: Terapeuta não possui vínculo ativo com este paciente.")
    );

    render(
      <ModalAnotacaoSessaoAtiva
        aberto={true}
        onFechar={vi.fn()}
        sessaoId={sessaoIdPadrao}
        pacienteId={pacienteIdPadrao}
      />
    );

    const textarea = screen.getByTestId("textarea-anotacao-sessao") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Tentativa de anotação sem vínculo autorizado." },
    });

    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao-modal");
    await act(async () => {
      fireEvent.click(botaoSalvar);
    });

    await waitFor(() => {
      expect(screen.getByTestId("erro-salvar-anotacao")).toBeDefined();
    });

    expect(screen.getByTestId("erro-salvar-anotacao").textContent).toContain("Acesso negado");
    expect(toast.error).toHaveBeenCalledWith(
      "Acesso negado: terapeuta sem vínculo ativo nesta clínica ou prontuário."
    );

    // O texto permanece no textarea para não perder dados
    expect(textarea.value).toBe("Tentativa de anotação sem vínculo autorizado.");
  });

  it("8. ControlesClinicos: deve disparar onAbrirAnotacoes e respeitar bloqueio em Modo Livre (RN01)", () => {
    const onAbrirAnotacoes = vi.fn();

    // Sessão Clínica com paciente
    const { rerender } = render(
      <ControlesClinicos
        isPausado={false}
        nivelDda={2}
        onPausar={vi.fn()}
        onRetomar={vi.fn()}
        onAjustarDda={vi.fn()}
        onAbrirModalFinalizar={vi.fn()}
        onAbrirAnotacoes={onAbrirAnotacoes}
        isModoLivre={false}
      />
    );

    const btnAnotacoes = screen.getByTestId("botao-abrir-anotacoes-cockpit");
    expect(btnAnotacoes.hasAttribute("disabled")).toBe(false);

    fireEvent.click(btnAnotacoes);
    expect(onAbrirAnotacoes).toHaveBeenCalledTimes(1);

    // Sessão em Modo Livre (RN01)
    rerender(
      <ControlesClinicos
        isPausado={false}
        nivelDda={2}
        onPausar={vi.fn()}
        onRetomar={vi.fn()}
        onAjustarDda={vi.fn()}
        onAbrirModalFinalizar={vi.fn()}
        onAbrirAnotacoes={onAbrirAnotacoes}
        isModoLivre={true}
      />
    );

    expect(btnAnotacoes.hasAttribute("disabled")).toBe(true);
    expect(btnAnotacoes.getAttribute("title")).toContain("Modo Livre");
  });

  it("9. CardSessaoAtiva: deve exibir identificação completa e respeitar botão de anotação rápida com RN01", () => {
    const onAbrirAnotacoes = vi.fn();

    const { rerender } = render(
      <CardSessaoAtiva
        sessaoId="sess-abc"
        pacienteId="pac-123"
        pacienteNome="Gabriel Santos"
        jogoTitulo="Caça-Tesouro Sensorial"
        tempoFormatado="08:42"
        status="em_andamento"
        onAbrirAnotacoes={onAbrirAnotacoes}
      />
    );

    expect(screen.getByTestId("card-sessao-ativa")).toBeDefined();
    expect(screen.getByTestId("card-paciente-nome").textContent).toBe("Gabriel Santos");
    expect(screen.getByTestId("card-jogo-titulo").textContent).toContain("Caça-Tesouro Sensorial");
    expect(screen.getByTestId("card-sessao-ativa-tempo").textContent).toBe("08:42");

    const btnAnotar = screen.getByTestId("botao-abrir-anotacoes-card");
    expect(btnAnotar.hasAttribute("disabled")).toBe(false);

    fireEvent.click(btnAnotar);
    expect(onAbrirAnotacoes).toHaveBeenCalledTimes(1);

    // Em Modo Livre
    rerender(
      <CardSessaoAtiva
        sessaoId="sess-abc"
        pacienteId={null}
        jogoTitulo="Caça-Tesouro Sensorial"
        tempoFormatado="08:42"
        status="em_andamento"
        isModoLivre={true}
        onAbrirAnotacoes={onAbrirAnotacoes}
      />
    );

    expect(screen.getByTestId("card-paciente-nome").textContent).toContain("Modo Livre");
    expect(btnAnotar.hasAttribute("disabled")).toBe(true);
    expect(btnAnotar.getAttribute("title")).toContain("Modo Livre");
  });
});