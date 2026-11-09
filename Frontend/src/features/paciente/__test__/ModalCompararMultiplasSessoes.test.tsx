import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModalCompararMultiplasSessoes } from "../components/ModalCompararMultiplasSessoes";
import type { Sessao } from "@/features/sessao/types/sessao.types";

const MOCK_SESSOES_MULTI: Sessao[] = [
  {
    id: "sessao-01",
    terapeuta_id: "terapeuta-1",
    paciente_id: "paciente-1",
    jogo_id: "jogo-labirinto",
    session_token: "TEA-101",
    modo_sessao: "sessao_clinica",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-10-01T14:00:00.000Z",
    duracao_segundos: 1000,
    jogo: {
      id: "jogo-labirinto",
      nome: "Labirinto das Emoções",
      categoria: "Regulação Emocional",
    },
    contexto_dda_json: {
      estresse_inicial: 3,
      dificuldade_inicial: 2,
    },
    metricas_consolidadas: {
      duracao_segundos: 1000,
      taxa_conclusao: 60,
      estabilidade_foco: 55,
      tempo_medio_resposta_ms: 900,
      pontuacao_geral: 400,
      total_acertos: 20,
      total_erros: 10,
      intervencoes_dda: 6,
    },
    terapeuta: {
      id: "terapeuta-1",
      nome: "Dr. Hermeson Alves",
    },
  },
  {
    id: "sessao-02",
    terapeuta_id: "terapeuta-1",
    paciente_id: "paciente-1",
    jogo_id: "jogo-labirinto",
    session_token: "TEA-102",
    modo_sessao: "sessao_clinica",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-10-08T14:00:00.000Z",
    duracao_segundos: 1200,
    jogo: {
      id: "jogo-labirinto",
      nome: "Labirinto das Emoções",
      categoria: "Regulação Emocional",
    },
    contexto_dda_json: {
      estresse_inicial: 2,
      dificuldade_inicial: 3,
    },
    metricas_consolidadas: {
      duracao_segundos: 1200,
      taxa_conclusao: 75,
      estabilidade_foco: 70,
      tempo_medio_resposta_ms: 750,
      pontuacao_geral: 650,
      total_acertos: 32,
      total_erros: 5,
      intervencoes_dda: 4,
    },
    terapeuta: {
      id: "terapeuta-1",
      nome: "Dr. Hermeson Alves",
    },
  },
  {
    id: "sessao-03",
    terapeuta_id: "terapeuta-1",
    paciente_id: "paciente-1",
    jogo_id: "jogo-labirinto",
    session_token: "TEA-103",
    modo_sessao: "sessao_clinica",
    status_sessao: "finalizada",
    data_hora_inicio: "2026-10-15T14:00:00.000Z",
    duracao_segundos: 1400,
    jogo: {
      id: "jogo-labirinto",
      nome: "Labirinto das Emoções",
      categoria: "Regulação Emocional",
    },
    contexto_dda_json: {
      estresse_inicial: 1,
      dificuldade_inicial: 4,
    },
    metricas_consolidadas: {
      duracao_segundos: 1400,
      taxa_conclusao: 90,
      estabilidade_foco: 85,
      tempo_medio_resposta_ms: 600,
      pontuacao_geral: 900,
      total_acertos: 45,
      total_erros: 2,
      intervencoes_dda: 1,
    },
    terapeuta: {
      id: "terapeuta-1",
      nome: "Dr. Hermeson Alves",
    },
  },
];

const MOCK_SESSAO_HETEROGENEA: Sessao = {
  id: "sessao-04",
  terapeuta_id: "terapeuta-1",
  paciente_id: "paciente-1",
  jogo_id: "jogo-espacial",
  session_token: "TEA-104",
  modo_sessao: "sessao_clinica",
  status_sessao: "finalizada",
  data_hora_inicio: "2026-10-22T14:00:00.000Z",
  duracao_segundos: 1100,
  jogo: {
    id: "jogo-espacial",
    nome: "Jornada Espacial TEA",
    categoria: "Atenção Sustentada",
  },
  metricas_consolidadas: {
    duracao_segundos: 1100,
    taxa_conclusao: 80,
    estabilidade_foco: 80,
    tempo_medio_resposta_ms: 700,
  },
};

describe("Componente: ModalCompararMultiplasSessoes (RF15, RF19, RN02)", () => {
  it("não deve renderizar conteúdo quando isOpen === false", () => {
    render(
      <ModalCompararMultiplasSessoes
        isOpen={false}
        onClose={() => {}}
        sessoes={MOCK_SESSOES_MULTI}
      />
    );

    expect(screen.queryByTestId("modal-comparar-multiplas-sessoes")).toBeNull();
  });

  it("deve renderizar modal com 3 sessões, linha do tempo e matriz comparativa escalável", () => {
    render(
      <ModalCompararMultiplasSessoes
        isOpen={true}
        onClose={() => {}}
        sessoes={MOCK_SESSOES_MULTI}
        pacienteNome="Pedro Silveira"
      />
    );

    expect(screen.getByTestId("modal-comparar-multiplas-sessoes")).toBeDefined();
    expect(screen.getByText("Comparação Analítica Multi-Sessões")).toBeDefined();
    expect(screen.getByText("3 Sessões Selecionadas")).toBeDefined();
    expect(screen.getAllByText("Labirinto das Emoções").length).toBeGreaterThan(0);

    // Fita timeline das sessões selecionadas
    expect(screen.getByTestId("fita-sessoes-timeline")).toBeDefined();
    expect(screen.getAllByText(/Ponto 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ponto 2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ponto 3/i).length).toBeGreaterThan(0);

    // Linhas da matriz métrica
    expect(screen.getByTestId("linha-metrica-taxa_conclusao")).toBeDefined();
    expect(screen.getByTestId("linha-metrica-estabilidade_foco")).toBeDefined();
    expect(screen.getByTestId("linha-metrica-tempo_medio_resposta_ms")).toBeDefined();
  });

  it("deve exibir alerta informativo quando houver jogos heterogêneos entre as sessões", () => {
    render(
      <ModalCompararMultiplasSessoes
        isOpen={true}
        onClose={() => {}}
        sessoes={[...MOCK_SESSOES_MULTI, MOCK_SESSAO_HETEROGENEA]}
      />
    );

    expect(screen.getByTestId("alerta-jogos-heterogeneos")).toBeDefined();
    expect(screen.getByText(/Comparação Multi-Jogos/i)).toBeDefined();
    expect(screen.getByText(/4 Sessões Selecionadas/i)).toBeDefined();
  });

  it("deve permitir alterar o Ponto Baseline clicando em 'Tornar Base'", () => {
    render(
      <ModalCompararMultiplasSessoes
        isOpen={true}
        onClose={() => {}}
        sessoes={MOCK_SESSOES_MULTI}
      />
    );

    // Inicialmente Ponto 1 é Base
    expect(screen.getByText("Ponto 1 (Base)")).toBeDefined();

    // Clica para tornar o Ponto 2 como base
    const botoesTornarBase = screen.getAllByRole("button", { name: /Tornar Base/i });
    expect(botoesTornarBase.length).toBeGreaterThan(0);
    fireEvent.click(botoesTornarBase[0]);

    // Agora Ponto 2 deve ser o Baseline
    expect(screen.getByText("Ponto 2 (Base)")).toBeDefined();
  });

  it("deve disparar onClose ao clicar em 'Fechar Comparativo'", () => {
    const handleClose = vi.fn();
    render(
      <ModalCompararMultiplasSessoes
        isOpen={true}
        onClose={handleClose}
        sessoes={MOCK_SESSOES_MULTI}
      />
    );

    const btnFechar = screen.getByTestId("botao-fechar-modal-multiplas");
    fireEvent.click(btnFechar);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
