import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TelemetriaCards } from "../components/telemetria/TelemetriaCards";
import { TelemetriaChart } from "../components/telemetria/TelemetriaChart";
import { TabletDiagnosticCard } from "../components/telemetria/TabletDiagnosticCard";
import type { MetricasTelemetria, PontoHistoricoTelemetria } from "../types";

describe("Card 4.4 — Testes de Componentes de Telemetria (Luma Maiara)", () => {
  describe("TelemetriaCards", () => {
    it("deve renderizar empty state quando não houver eventos de telemetria", () => {
      const metricasVazias: MetricasTelemetria = {
        acertos: 0,
        erros: 0,
        tempoMedioRespostaMs: 0,
        nivelEngajamento: 0,
        nivelAtencao: 0,
        nivelEstresseAtual: 1,
        totalEventos: 0,
      };

      render(<TelemetriaCards metricas={metricasVazias} />);

      expect(screen.getByTestId("telemetria-empty-state")).toBeDefined();
      expect(screen.getByText("Aguardando telemetria em tempo real")).toBeDefined();
    });

    it("deve exibir valores corretos de acertos, erros, tempo de reação e engajamento", () => {
      const metricasPreenchidas: MetricasTelemetria = {
        acertos: 14,
        erros: 2,
        tempoMedioRespostaMs: 1450,
        nivelEngajamento: 92,
        nivelAtencao: 88,
        nivelEstresseAtual: 2,
        totalEventos: 16,
      };

      render(<TelemetriaCards metricas={metricasPreenchidas} />);

      expect(screen.getByTestId("card-acertos-valor").textContent).toBe("14");
      expect(screen.getByTestId("card-erros-valor").textContent).toBe("2");
      expect(screen.getByTestId("card-tempo-resposta-valor").textContent).toContain("1.45s");
      expect(screen.getByTestId("card-engajamento-valor").textContent).toBe("92%");
      expect(screen.getByText(/Atenção: 88%/)).toBeDefined();
    });
  });

  describe("TelemetriaChart", () => {
    it("deve renderizar placeholder amigável se o histórico de pontos estiver vazio", () => {
      render(<TelemetriaChart historico={[]} />);
      expect(screen.getByTestId("telemetria-chart-empty")).toBeDefined();
    });

    it("deve renderizar gráfico vetorial SVG com múltiplos pontos temporais", () => {
      const historicoMock: PontoHistoricoTelemetria[] = [
        { tempoFormatado: "00:01", segundo: 1, atencao: 80, engajamento: 85, estresse: 1 },
        { tempoFormatado: "00:02", segundo: 2, atencao: 85, engajamento: 90, estresse: 1 },
        { tempoFormatado: "00:03", segundo: 3, atencao: 75, engajamento: 88, estresse: 2 },
      ];

      render(<TelemetriaChart historico={historicoMock} />);
      expect(screen.getByTestId("telemetria-chart-container")).toBeDefined();
      expect(screen.getByText(/Engajamento \(88%\)/)).toBeDefined();
      expect(screen.getByText(/Atenção \(75%\)/)).toBeDefined();
    });
  });

  describe("TabletDiagnosticCard", () => {
    it("deve renderizar latência em verde quando < 100ms", () => {
      render(
        <TabletDiagnosticCard
          latenciaMs={45}
          bateria={85}
          qualidadeSinal="excelente"
          isConectado={true}
        />
      );

      const valorLatencia = screen.getByTestId("valor-latencia");
      expect(valorLatencia.textContent).toBe("45 ms");

      const badgeLatencia = screen.getByTestId("badge-latencia");
      expect(badgeLatencia.textContent).toBe("Excelente");
      expect(badgeLatencia.className).toContain("text-emerald-600");
    });

    it("deve renderizar latência em amarelo quando entre 100ms e 300ms", () => {
      render(
        <TabletDiagnosticCard
          latenciaMs={180}
          bateria={50}
          qualidadeSinal="bom"
          isConectado={true}
        />
      );

      const badgeLatencia = screen.getByTestId("badge-latencia");
      expect(badgeLatencia.textContent).toContain("Atenção");
      expect(badgeLatencia.className).toContain("text-amber-600");
    });

    it("deve renderizar latência em vermelho quando > 300ms", () => {
      render(
        <TabletDiagnosticCard
          latenciaMs={420}
          bateria={25}
          qualidadeSinal="fraco"
          isConectado={true}
        />
      );

      const badgeLatencia = screen.getByTestId("badge-latencia");
      expect(badgeLatencia.textContent).toContain("Instável");
      expect(badgeLatencia.className).toContain("text-rose-600");
    });

    it("deve renderizar alerta visual proeminente quando desconectado", () => {
      render(
        <TabletDiagnosticCard
          latenciaMs={0}
          bateria={0}
          isConectado={false}
        />
      );

      expect(screen.getByTestId("alerta-desconexao-tablet")).toBeDefined();
      expect(screen.getByText("Atenção: Comunicação interrompida com o tablet!")).toBeDefined();
    });
  });
});
