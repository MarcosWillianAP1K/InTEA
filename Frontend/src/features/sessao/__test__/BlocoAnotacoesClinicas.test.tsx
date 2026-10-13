import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BlocoAnotacoesClinicas } from "../components/resultado/BlocoAnotacoesClinicas";
import { sessaoService } from "../services/sessaoService";

describe("Card 3.3 — Testes do Bloco de Anotações Clínicas (Hermeson Alves)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar a identificação indelével do terapeuta autor e registro profissional (RF21)", () => {
    render(
      <BlocoAnotacoesClinicas
        terapeutaNome="Hermeson Alves"
        terapeutaRegistro="CRP 11/04589"
      />
    );

    const autorInfo = screen.getByTestId("terapeuta-autor-info");
    expect(autorInfo.textContent).toContain("Hermeson Alves");
    expect(autorInfo.textContent).toContain("CRP 11/04589");
  });

  it("deve exibir anotação preliminar e contador de caracteres", () => {
    const textoInicial = "Paciente interagiu com estímulos visuais.";

    render(<BlocoAnotacoesClinicas anotacaoInicial={textoInicial} />);

    const textarea = screen.getByTestId("textarea-anotacoes-clinicas") as HTMLTextAreaElement;
    expect(textarea.value).toBe(textoInicial);

    const contador = screen.getByTestId("contador-caracteres");
    expect(contador.textContent).toContain(`${textoInicial.length} / 2000 caracteres`);
  });

  it("deve permitir ao terapeuta digitar novas observações e atualizar o contador", () => {
    render(<BlocoAnotacoesClinicas anotacaoInicial="" />);

    const textarea = screen.getByTestId("textarea-anotacoes-clinicas") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Excelente regulação e resposta motora rápida." },
    });

    expect(textarea.value).toBe("Excelente regulação e resposta motora rápida.");

    const contador = screen.getByTestId("contador-caracteres");
    expect(contador.textContent).toContain(
      `${"Excelente regulação e resposta motora rápida.".length} / 2000 caracteres`
    );
  });

  it("deve salvar com sucesso e exibir indicador visual 'Salvo com sucesso'", async () => {
    const spySalvar = vi.spyOn(sessaoService, "salvarAnotacao").mockResolvedValue({
      sucesso: true,
      data: {
        id: "anot-123",
        conteudo: "Paciente manteve atenção concentrada.",
        terapeuta_id: "terap-1",
      },
    });

    render(
      <BlocoAnotacoesClinicas
        sessaoId="sessao-abc"
        pacienteId="pac-456"
        anotacaoInicial="Paciente manteve atenção concentrada."
      />
    );

    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao") as HTMLButtonElement;
    expect(botaoSalvar.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(botaoSalvar);
    });

    expect(spySalvar).toHaveBeenCalledWith({
      sessaoId: "sessao-abc",
      pacienteId: "pac-456",
      anotacaoId: undefined,
      conteudo: "Paciente manteve atenção concentrada.",
    });

    expect(screen.getByTestId("status-salvo")).toBeDefined();
    expect(screen.getByTestId("status-salvo").textContent).toContain("Salvo com sucesso");
  });

  it("deve prevenir cliques múltiplos concorrentes desabilitando o botão durante salvamento", async () => {
    let resolverPromise: (val: unknown) => void = () => {};
    const promessaPendente = new Promise((resolve) => {
      resolverPromise = resolve;
    });

    vi.spyOn(sessaoService, "salvarAnotacao").mockReturnValue(promessaPendente as any);

    render(
      <BlocoAnotacoesClinicas
        sessaoId="sessao-abc"
        anotacaoInicial="Observação clínica preliminar..."
      />
    );

    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao") as HTMLButtonElement;

    // Primeiro clique inicia o salvamento
    await act(async () => {
      fireEvent.click(botaoSalvar);
    });

    // Deve exibir spinner e indicador de salvando
    expect(screen.getByTestId("status-salvando")).toBeDefined();
    expect(botaoSalvar.disabled).toBe(true);

    // Finaliza a promessa
    await act(async () => {
      resolverPromise({ sucesso: true });
    });

    // Deve atualizar para salvo
    expect(screen.getByTestId("status-salvo")).toBeDefined();
  });

  it("deve exibir feedback visual claro caso ocorra falha ao persistir", async () => {
    vi.spyOn(sessaoService, "salvarAnotacao").mockResolvedValue({
      sucesso: false,
      error: "Erro de permissão no prontuário eletrônico (RN04)",
    });

    render(
      <BlocoAnotacoesClinicas
        sessaoId="sessao-abc"
        anotacaoInicial="Nova observação relevante..."
      />
    );

    const botaoSalvar = screen.getByTestId("botao-salvar-anotacao");

    await act(async () => {
      fireEvent.click(botaoSalvar);
    });

    const statusErro = screen.getByTestId("status-erro");
    expect(statusErro).toBeDefined();
    expect(statusErro.textContent).toContain("Erro de permissão no prontuário eletrônico (RN04)");
  });

  it("deve respeitar modo readOnly ocultando botão de ação e desabilitando textarea", () => {
    render(
      <BlocoAnotacoesClinicas
        anotacaoInicial="Relatório clínico histórico e imutável."
        readOnly={true}
      />
    );

    const textarea = screen.getByTestId("textarea-anotacoes-clinicas") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);

    expect(screen.queryByTestId("botao-salvar-anotacao")).toBeNull();
  });
});
