import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ResultadoSessaoPage } from "../pages/ResultadoSessaoPage";
import { sessaoService, type DadosResultadoSessao } from "../services/sessaoService";
import { useSessionStore } from "../store/sessionStore";

// Mock do useNavigate e useParams
const mockNavigate = vi.fn();
let mockParams = { id: "sessao-teste-123" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

describe("Card 3.1 & 3.4 — Testes da Página Mestre de Resultados da Sessão (Hermeson Alves)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "sessao-teste-123" };
    window.sessionStorage.clear();
    useSessionStore.getState().reset();
  });

  const dadosSessaoMock: DadosResultadoSessao = {
    id: "sessao-teste-123",
    session_token: "token-9988",
    status_sessao: "finalizada",
    duracao_segundos: 1200,
    data_hora_inicio: "2026-10-13T14:00:00Z",
    data_hora_fim: "2026-10-13T14:20:00Z",
    paciente: {
      id: "pac-123",
      nome: "Gabriel Lima",
    },
    jogo: {
      id: "jogo-1",
      titulo: "Mundo das Cores e Sons",
    },
    terapeuta: {
      id: "terap-1",
      nome: "Hermeson Alves",
      registro_profissional: "CRP 11/04589",
    },
    dados_ia: {
      token_sessao: "token-9988",
      duracao_segundos: 1200,
      resumo: {
        taxa_conclusao: 92.4,
        intervencoes_dda: 2,
      },
      analises_ia: [
        "Paciente apresentou alta estabilidade atencional durante a atividade.",
        "Adaptação contextual de dificuldade (DDA) preveniu episódios de sobrecarga sensorial.",
      ],
      metricas_agregadas: [
        {
          id_metrica: "tempo_reacao",
          valor_dominante: "1.2s",
          tendencia: "crescente",
        },
      ],
    },
    anotacoes: [
      {
        id: "anot-1",
        conteudo: "Excelente evolução clínica observada no foco motor.",
        terapeuta_id: "terap-1",
        terapeuta_nome: "Hermeson Alves",
        registro_profissional: "CRP 11/04589",
        created_at: "2026-10-13T14:22:00Z",
      },
    ],
  };

  it("Estado 1 (Loading State): deve renderizar Skeleton Loaders estruturais sem saltos de layout (zero CLS)", async () => {
    let resolverPromise: (val: unknown) => void = () => {};
    const promessaPendente = new Promise((resolve) => {
      resolverPromise = resolve;
    });

    vi.spyOn(sessaoService, "buscarResultado").mockReturnValue(promessaPendente as any);

    render(
      <BrowserRouter>
        <ResultadoSessaoPage />
      </BrowserRouter>
    );

    // Deve exibir o container com data-testid loading-state
    expect(screen.getByTestId("loading-state")).toBeDefined();

    // Finaliza a promessa com mock
    await act(async () => {
      resolverPromise({ sucesso: true, data: dadosSessaoMock });
    });
  });

  it("Estado 2 (Error State): deve exibir feedback amigável e permitir nova tentativa com botão 'Tentar Novamente'", async () => {
    const spyBuscar = vi.spyOn(sessaoService, "buscarResultado").mockResolvedValueOnce({
      sucesso: false,
      error: "Falha na conexão com o servidor",
    });

    render(
      <BrowserRouter>
        <ResultadoSessaoPage />
      </BrowserRouter>
    );

    // Aguarda resolução da busca falha
    await act(async () => {});

    expect(screen.getByTestId("error-state")).toBeDefined();
    expect(screen.getByText("Falha ao Carregar Resultados")).toBeDefined();

    // Simula clique em Tentar Novamente com sucesso na 2ª tentativa
    spyBuscar.mockResolvedValueOnce({
      sucesso: true,
      data: dadosSessaoMock,
    });

    const btnTentarNovamente = screen.getByTestId("btn-tentar-novamente");
    await act(async () => {
      fireEvent.click(btnTentarNovamente);
    });

    expect(screen.getByTestId("resultado-sessao-page")).toBeDefined();
    expect(screen.getByText("Gabriel Lima")).toBeDefined();
  });

  it("Estado 3 (Empty State): deve exibir mensagem amigável caso a sessão não possua telemetria ou métricas", async () => {
    vi.spyOn(sessaoService, "buscarResultado").mockResolvedValue({
      sucesso: true,
      data: {
        ...dadosSessaoMock,
        dados_ia: null,
        duracao_segundos: 0,
      },
    });

    render(
      <BrowserRouter>
        <ResultadoSessaoPage />
      </BrowserRouter>
    );

    await act(async () => {});

    expect(screen.getByTestId("empty-state")).toBeDefined();
    expect(screen.getByText("Nenhuma Métrica Consolidada")).toBeDefined();
  });

  it("Estado 4 (Success State): deve renderizar cabeçalho clínico completo, dados do paciente e terapeuta autor (RF14, RF21)", async () => {
    vi.spyOn(sessaoService, "buscarResultado").mockResolvedValue({
      sucesso: true,
      data: dadosSessaoMock,
    });

    render(
      <BrowserRouter>
        <ResultadoSessaoPage />
      </BrowserRouter>
    );

    await act(async () => {});

    // Cabeçalho e Paciente
    expect(screen.getByTestId("resultado-sessao-page")).toBeDefined();
    expect(screen.getByTestId("cabecalho-clinico")).toBeDefined();
    expect(screen.getByText("Gabriel Lima")).toBeDefined();
    expect(screen.getByTestId("badge-sessao-finalizada")).toBeDefined();

    // Terapeuta Autor (RF21)
    const terapeutaInfo = screen.getByTestId("terapeuta-responsavel-header");
    expect(terapeutaInfo.textContent).toContain("Hermeson Alves");
    expect(terapeutaInfo.textContent).toContain("CRP 11/04589");

    // Métricas padrão
    expect(screen.getByText("Mundo das Cores e Sons")).toBeDefined();
    expect(screen.getByText("92.4%")).toBeDefined();
  });

  it("deve tratar sessões em Modo Livre suprimindo dados de prontuário e exibindo badge informativo (RN01)", async () => {
    vi.spyOn(sessaoService, "buscarResultado").mockResolvedValue({
      sucesso: true,
      data: {
        ...dadosSessaoMock,
        is_modo_livre: true,
        paciente: null,
      },
    });

    render(
      <BrowserRouter>
        <ResultadoSessaoPage />
      </BrowserRouter>
    );

    await act(async () => {});

    expect(screen.getByTestId("badge-modo-livre")).toBeDefined();
    expect(screen.getByText("Modo Livre (RN01)")).toBeDefined();
    expect(screen.getByText("Modo Livre (Sem Prontuário)")).toBeDefined();
  });

  it("deve permitir customização através de slots modulares estruturais", async () => {
    render(
      <BrowserRouter>
        <ResultadoSessaoPage
          initialData={dadosSessaoMock}
          metricasSlot={<div data-testid="custom-metricas-slot">Cards da Luma</div>}
          graficoSlot={<div data-testid="custom-grafico-slot">Gráfico SVG da Luma</div>}
          insightsIASlot={<div data-testid="custom-insights-slot">Painel IA da Luma</div>}
          anotacoesSlot={<div data-testid="custom-anotacoes-slot">Slot de Anotações</div>}
        />
      </BrowserRouter>
    );

    expect(screen.getByTestId("custom-metricas-slot")).toBeDefined();
    expect(screen.getByTestId("custom-grafico-slot")).toBeDefined();
    expect(screen.getByTestId("custom-insights-slot")).toBeDefined();
    expect(screen.getByTestId("custom-anotacoes-slot")).toBeDefined();
  });
});
