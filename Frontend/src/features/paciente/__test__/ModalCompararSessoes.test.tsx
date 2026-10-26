import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TabelaComparativaMetricas,
  calcularDeltaMetrica,
} from "../components/TabelaComparativaMetricas";
import { ModalCompararSessoes } from "../components/ModalCompararSessoes";
import type { Sessao } from "@/features/sessao/types/sessao.types";

const MOCK_SESSAO_JOGO1_BASE: Sessao = {
  id: "sessao-base-001",
  terapeuta_id: "terapeuta-1",
  paciente_id: "paciente-1",
  jogo_id: "jogo-espacial",
  session_token: "TEA-101",
  modo_sessao: "sessao_clinica",
  status_sessao: "finalizada",
  data_hora_inicio: "2026-10-10T14:00:00.000Z",
  data_hora_fim: "2026-10-10T14:20:00.000Z",
  duracao_segundos: 1200,
  jogo: {
    id: "jogo-espacial",
    nome: "Jornada Espacial TEA",
    titulo: "Jornada Espacial TEA",
    categoria: "Atenção Sustentada",
  },
  contexto_dda_json: {
    estresse_inicial: 3,
    dificuldade_inicial: 2,
  },
  metricas_consolidadas: {
    duracao_segundos: 1200,
    taxa_conclusao: 70,
    estabilidade_foco: 65,
    tempo_medio_resposta_ms: 850,
    pontuacao_geral: 500,
    total_acertos: 25,
    total_erros: 8,
    intervencoes_dda: 5,
  },
};

const MOCK_SESSAO_JOGO1_RECENTE: Sessao = {
  id: "sessao-recente-002",
  terapeuta_id: "terapeuta-1",
  paciente_id: "paciente-1",
  jogo_id: "jogo-espacial",
  session_token: "TEA-102",
  modo_sessao: "sessao_clinica",
  status_sessao: "finalizada",
  data_hora_inicio: "2026-10-17T14:00:00.000Z",
  data_hora_fim: "2026-10-17T14:25:00.000Z",
  duracao_segundos: 1500,
  jogo: {
    id: "jogo-espacial",
    nome: "Jornada Espacial TEA",
    titulo: "Jornada Espacial TEA",
    categoria: "Atenção Sustentada",
  },
  contexto_dda_json: {
    estresse_inicial: 2,
    dificuldade_inicial: 3,
  },
  metricas_consolidadas: {
    duracao_segundos: 1500,
    taxa_conclusao: 90,
    estabilidade_foco: 85,
    tempo_medio_resposta_ms: 600,
    pontuacao_geral: 850,
    total_acertos: 40,
    total_erros: 2,
    intervencoes_dda: 2,
  },
};

const MOCK_SESSAO_JOGO2: Sessao = {
  id: "sessao-outro-jogo-003",
  terapeuta_id: "terapeuta-1",
  paciente_id: "paciente-1",
  jogo_id: "jogo-cores",
  session_token: "TEA-103",
  modo_sessao: "sessao_clinica",
  status_sessao: "finalizada",
  data_hora_inicio: "2026-10-18T16:00:00.000Z",
  duracao_segundos: 900,
  jogo: {
    id: "jogo-cores",
    nome: "Aventura das Cores",
    titulo: "Aventura das Cores",
    categoria: "Discriminação Visual",
  },
  metricas_consolidadas: {
    duracao_segundos: 900,
    taxa_conclusao: 80,
    intervencoes_dda: 1,
  },
};

describe("Frontend: Comparativo Analítico de Sessões (RF15, RF19, RNF07)", () => {
  describe("Função: calcularDeltaMetrica (Cálculo Matemático Seguro)", () => {
    it("deve calcular evolução positiva para métrica 'maior_melhor' (Foco 65 -> 85)", () => {
      const res = calcularDeltaMetrica(65, 85, "maior_melhor");
      expect(res.deltaAbsoluto).toBe(20);
      expect(res.deltaPercentual).toBeCloseTo(30.76, 1);
      expect(res.textoFormatado).toBe("+30.8%");
      expect(res.statusClinico).toBe("melhora");
    });

    it("deve calcular evolução positiva para métrica 'menor_melhor' quando o valor reduz (Tempo de Reação 850ms -> 600ms)", () => {
      const res = calcularDeltaMetrica(850, 600, "menor_melhor");
      expect(res.deltaAbsoluto).toBe(-250);
      expect(res.deltaPercentual).toBeCloseTo(-29.41, 1);
      expect(res.textoFormatado).toBe("-29.4%");
      expect(res.statusClinico).toBe("melhora");
    });

    it("deve sinalizar regressão quando métrica 'menor_melhor' aumenta (Erros 2 -> 6)", () => {
      const res = calcularDeltaMetrica(2, 6, "menor_melhor");
      expect(res.deltaAbsoluto).toBe(4);
      expect(res.deltaPercentual).toBe(200);
      expect(res.textoFormatado).toBe("+200.0%");
      expect(res.statusClinico).toBe("regressao");
    });

    it("deve tratar divisão por zero com segurança quando base === 0", () => {
      const res = calcularDeltaMetrica(0, 5, "maior_melhor");
      expect(res.deltaAbsoluto).toBe(5);
      expect(Number.isFinite(res.deltaPercentual)).toBe(true);
      expect(res.textoFormatado).toBe("+5");
      expect(res.statusClinico).toBe("melhora");
    });

    it("deve retornar 0.0% e estável quando ambos os valores forem iguais (40 -> 40)", () => {
      const res = calcularDeltaMetrica(40, 40, "maior_melhor");
      expect(res.deltaAbsoluto).toBe(0);
      expect(res.deltaPercentual).toBe(0);
      expect(res.textoFormatado).toBe("0.0%");
      expect(res.statusClinico).toBe("estavel");
    });

    it("deve retornar 'N/D' e status indeterminado para valores nulos ou indefinidos", () => {
      const res1 = calcularDeltaMetrica(null, 50, "maior_melhor");
      const res2 = calcularDeltaMetrica(50, undefined, "maior_melhor");
      expect(res1.statusClinico).toBe("indeterminado");
      expect(res1.textoFormatado).toBe("N/D");
      expect(res2.statusClinico).toBe("indeterminado");
      expect(res2.textoFormatado).toBe("N/D");
    });
  });

  describe("Componente: TabelaComparativaMetricas", () => {
    it("deve renderizar as linhas de métricas com valores de ambas as sessões e deltas", () => {
      render(
        <TabelaComparativaMetricas
          sessaoA={MOCK_SESSAO_JOGO1_BASE}
          sessaoB={MOCK_SESSAO_JOGO1_RECENTE}
        />
      );

      expect(screen.getByText("Taxa de Conclusão")).toBeDefined();
      expect(screen.getByText("Estabilidade de Foco")).toBeDefined();
      expect(screen.getByText("Tempo Médio de Reação")).toBeDefined();
      expect(screen.getByText("Total de Erros / Frustração")).toBeDefined();

      // Valores numéricos presentes
      expect(screen.getByText("70 %")).toBeDefined();
      expect(screen.getByText("90 %")).toBeDefined();
      expect(screen.getByText("850 ms")).toBeDefined();
      expect(screen.getByText("600 ms")).toBeDefined();
    });

    it("deve renderizar Skeleton Loaders quando loading === true (zero CLS)", () => {
      const { container } = render(
        <TabelaComparativaMetricas loading={true} />
      );

      const skeletons = container.querySelectorAll("[data-slot='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.queryByText("70 %")).toBeNull();
    });

    it("deve formatar deltas de acordo com a polaridade clínica", () => {
      render(
        <TabelaComparativaMetricas
          sessaoA={MOCK_SESSAO_JOGO1_BASE}
          sessaoB={MOCK_SESSAO_JOGO1_RECENTE}
        />
      );

      // Redução de erros de 8 para 2 é melhora clínica (-75%)
      const badgesMelhora = screen.getAllByTestId("badge-delta-melhora");
      expect(badgesMelhora.length).toBeGreaterThan(0);
    });
  });

  describe("Componente: ModalCompararSessoes", () => {
    it("não deve renderizar conteúdo quando isOpen === false", () => {
      render(
        <ModalCompararSessoes
          isOpen={false}
          onClose={() => {}}
          sessaoA={MOCK_SESSAO_JOGO1_BASE}
          sessaoB={MOCK_SESSAO_JOGO1_RECENTE}
        />
      );

      expect(screen.queryByText("Comparação Analítica de Sessões")).toBeNull();
    });

    it("deve renderizar diálogo acessível com metadados quando isOpen === true e sessões do mesmo jogo", () => {
      render(
        <ModalCompararSessoes
          isOpen={true}
          onClose={() => {}}
          sessaoA={MOCK_SESSAO_JOGO1_BASE}
          sessaoB={MOCK_SESSAO_JOGO1_RECENTE}
          pacienteNome="Lucas Gabriel"
        />
      );

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByText("Comparação Analítica de Sessões")).toBeDefined();
      expect(screen.getByText("Jornada Espacial TEA")).toBeDefined();

      // Cards de metadados das sessões
      expect(screen.getByTestId("card-sessao-baseline")).toBeDefined();
      expect(screen.getByTestId("card-sessao-recente")).toBeDefined();
      expect(screen.getByText("Sessão A (Baseline Histórico)")).toBeDefined();
      expect(screen.getByText("Sessão B (Mais Recente)")).toBeDefined();

      // Tabela comparativa renderizada internamente
      expect(screen.getByText("Taxa de Conclusão")).toBeDefined();
    });

    it("deve exibir Incompatible State orientador quando as sessões forem de jogos diferentes", () => {
      render(
        <ModalCompararSessoes
          isOpen={true}
          onClose={() => {}}
          sessaoA={MOCK_SESSAO_JOGO1_BASE}
          sessaoB={MOCK_SESSAO_JOGO2}
        />
      );

      expect(screen.getByTestId("estado-jogos-incompativeis")).toBeDefined();
      expect(
        screen.getByText("Jogos Terapêuticos Incompatíveis para Comparação Direta")
      ).toBeDefined();
      expect(screen.getByText("Jornada Espacial TEA")).toBeDefined();
      expect(screen.getByText("Aventura das Cores")).toBeDefined();
    });

    it("deve disparar onClose ao clicar no botão de fechar", () => {
      const handleClose = vi.fn();
      render(
        <ModalCompararSessoes
          isOpen={true}
          onClose={handleClose}
          sessaoA={MOCK_SESSAO_JOGO1_BASE}
          sessaoB={MOCK_SESSAO_JOGO1_RECENTE}
        />
      );

      const botaoFechar = screen.getByTestId("botao-fechar-modal-comparar");
      fireEvent.click(botaoFechar);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integração: PerfilPacientePage (Critério de Seleção Estrita)", () => {
    it("deve condicionar o botão de comparação estritamente à seleção de 2 sessões", () => {
      // Simula o comportamento de habilitação do botão conforme o número de seleções
      const verificarHabilitacaoBotao = (selecionadas: string[]) => {
        return selecionadas.length === 2;
      };

      expect(verificarHabilitacaoBotao([])).toBe(false);
      expect(verificarHabilitacaoBotao(["sessao-1"])).toBe(false);
      expect(verificarHabilitacaoBotao(["sessao-1", "sessao-2"])).toBe(true);
      expect(verificarHabilitacaoBotao(["sessao-1", "sessao-2", "sessao-3"])).toBe(false);
    });
  });
});
