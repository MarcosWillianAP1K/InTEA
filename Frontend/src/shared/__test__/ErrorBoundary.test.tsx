import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

function ComponenteQuebrado({ deveFalhar }: { deveFalhar: boolean }) {
  if (deveFalhar) {
    throw new Error("Falha intencional de renderização para teste do ErrorBoundary.");
  }
  return <div data-testid="conteudo-normal">Conteúdo Clínico Renderizado</div>;
}

describe("Componente: ErrorBoundary (Resiliência contra Tela Branca)", () => {
  it("deve renderizar os componentes filhos normalmente quando não há erros", () => {
    render(
      <ErrorBoundary>
        <ComponenteQuebrado deveFalhar={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("conteudo-normal")).toBeDefined();
    expect(screen.getByText("Conteúdo Clínico Renderizado")).toBeDefined();
  });

  it("deve capturar erro de renderização e exibir tela de recuperação em vez de tela branca", () => {
    // Silencia o console.error esperado do React durante o teste de erro
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ComponenteQuebrado deveFalhar={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeDefined();
    expect(
      screen.getByText("Ops! Ocorreu uma instabilidade nesta tela")
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Tentar novamente/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Voltar ao Início/i })
    ).toBeDefined();

    consoleErrorSpy.mockRestore();
  });

  it("deve permitir acionar onReset ao clicar em 'Tentar novamente'", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onResetMock = vi.fn();

    render(
      <ErrorBoundary onReset={onResetMock}>
        <ComponenteQuebrado deveFalhar={true} />
      </ErrorBoundary>
    );

    const btnTentarNovamente = screen.getByRole("button", { name: /Tentar novamente/i });
    fireEvent.click(btnTentarNovamente);

    expect(onResetMock).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });
});
