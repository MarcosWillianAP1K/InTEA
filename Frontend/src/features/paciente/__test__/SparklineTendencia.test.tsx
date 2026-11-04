import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SparklineTendencia } from "../components/SparklineTendencia";

describe("Componente SparklineTendencia — Conformidade com Critérios de Aceite", () => {
  // 1. Renderização SVG e Prevenção de Layout Shift
  it("deve renderizar puramente em SVG com viewBox='0 0 60 20' e preserveAspectRatio='none'", () => {
    const data = [30, 45, 60, 50, 75];
    render(<SparklineTendencia data={data} />);

    const svg = screen.getByRole("img");
    expect(svg).toBeDefined();
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 60 20");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
  });

  // 2. Acessibilidade (a11y/WCAG) e Tendência Textual para Leitores de Tela
  describe("Conformidade de Acessibilidade (role='img', <title> e aria-label descritivo)", () => {
    it("deve detalhar textual e semanticamente a tendência de alta", () => {
      const data = [20, 35, 50, 80];
      render(<SparklineTendencia data={data} />);

      const svg = screen.getByRole("img");
      const labelEsperado = "Tendência de alta: início em 20% e término em 80%";
      expect(svg.getAttribute("aria-label")).toBe(labelEsperado);

      const title = svg.querySelector("title");
      expect(title).toBeDefined();
      expect(title?.textContent).toBe(labelEsperado);
    });

    it("deve detalhar textual e semanticamente a tendência de queda", () => {
      const data = [85, 70, 60, 40];
      render(<SparklineTendencia data={data} />);

      const svg = screen.getByRole("img");
      const labelEsperado = "Tendência de queda: início em 85% e término em 40%";
      expect(svg.getAttribute("aria-label")).toBe(labelEsperado);

      const title = svg.querySelector("title");
      expect(title).toBeDefined();
      expect(title?.textContent).toBe(labelEsperado);
    });

    it("deve detalhar textual e semanticamente a tendência estável", () => {
      const data = [50, 50, 50];
      render(<SparklineTendencia data={data} />);

      const svg = screen.getByRole("img");
      const labelEsperado = "Tendência estável em 50%";
      expect(svg.getAttribute("aria-label")).toBe(labelEsperado);

      const title = svg.querySelector("title");
      expect(title).toBeDefined();
      expect(title?.textContent).toBe(labelEsperado);
    });
  });

  // 3. Ponto Âncora no último registro e Diferenciação Visual
  it("deve renderizar ponto âncora (<circle>) na última coordenada para além da cor", () => {
    const data = [10, 50, 90];
    render(<SparklineTendencia data={data} mostrarPontoAncora={true} />);

    const circle = screen.getByTestId("sparkline-anchor-point");
    expect(circle).toBeDefined();
    expect(circle.tagName.toLowerCase()).toBe("circle");
    // Último ponto X deve estar próximo do limite direito (57)
    expect(Number(circle.getAttribute("cx"))).toBe(57);
    // Como 90 é o valor máximo, Y deve estar no topo com padding (3)
    expect(Number(circle.getAttribute("cy"))).toBe(3);
  });

  it("não deve renderizar ponto âncora quando mostrarPontoAncora for false", () => {
    const data = [10, 50, 90];
    render(<SparklineTendencia data={data} mostrarPontoAncora={false} />);

    expect(screen.queryByTestId("sparkline-anchor-point")).toBeNull();
  });

  // 4. Normalização Geométrica de Coordenadas
  it("deve normalizar corretamente as coordenadas dentro do viewBox de polyline", () => {
    // 3 pontos: mínimo (10), médio (50), máximo (90)
    const data = [10, 50, 90];
    render(<SparklineTendencia data={data} />);

    const polyline = screen.getByTestId("sparkline-polyline");
    expect(polyline).toBeDefined();

    const points = polyline.getAttribute("points");
    expect(points).toBeDefined();
    // Ponto 1: x=3, y=17 (mínimo)
    // Ponto 2: x=30, y=10 (médio)
    // Ponto 3: x=57, y=3 (máximo)
    expect(points).toBe("3,17 30,10 57,3");
  });

  // 5. Tratamento de Empty State (nulo, vazio ou menos de 2 pontos históricos)
  describe("Tratamento de Empty State (Indicador Neutro Gracioso)", () => {
    it("deve exibir linha guia atenuada quando data for nulo", () => {
      render(<SparklineTendencia data={null} />);

      const svg = screen.getByRole("img");
      expect(svg.getAttribute("aria-label")).toBe(
        "Dados históricos insuficientes para exibir tendência"
      );

      const emptyLine = screen.getByTestId("sparkline-empty-state");
      expect(emptyLine).toBeDefined();
      expect(emptyLine.tagName.toLowerCase()).toBe("line");
      expect(screen.queryByTestId("sparkline-polyline")).toBeNull();
      expect(screen.queryByTestId("sparkline-anchor-point")).toBeNull();
    });

    it("deve exibir indicador neutro gracioso quando data for um array vazio", () => {
      render(<SparklineTendencia data={[]} />);

      expect(screen.getByTestId("sparkline-empty-state")).toBeDefined();
      expect(screen.queryByTestId("sparkline-polyline")).toBeNull();
    });

    it("deve exibir indicador neutro gracioso quando data contiver apenas 1 ponto histórico (< 2 pontos)", () => {
      render(<SparklineTendencia data={[65]} />);

      expect(screen.getByTestId("sparkline-empty-state")).toBeDefined();
      expect(screen.queryByTestId("sparkline-polyline")).toBeNull();
    });
  });

  // 6. Propriedades de Dimensões e Classes Utilitárias
  it("deve aplicar dimensões (width, height) e classes utilitárias via props", () => {
    render(
      <SparklineTendencia
        data={[10, 20, 30]}
        width={80}
        height={24}
        className="custom-sparkline-class"
      />
    );

    const svg = screen.getByRole("img");
    expect(svg.getAttribute("width")).toBe("80");
    expect(svg.getAttribute("height")).toBe("24");
    expect(svg.getAttribute("class")).toContain("custom-sparkline-class");
  });
});

